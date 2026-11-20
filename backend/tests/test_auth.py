"""Isolated auth/notification tests. Never connect to the configured database."""
import os
import sys
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Integer, MetaData, create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import app
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db import session as db_module
from app.models import User, Wallet, Notification
from app.repositories import notification_repo
from app.services.password_recovery import PasswordRecovery, get_password_recovery
from app.services.password_recovery import DemoOTPStore
from app.services import password_recovery as recovery_module
from app.core.config import Settings, settings

EMAIL = 'auth@example.com'
PASSWORD = 'StrongPassword123!'
NEW = 'NewStrongPassword456!'

class FakeOTPStore(DemoOTPStore):
    """Use the actual demo store with a controllable clock, without sleeping."""
    def __init__(self):
        self.now = 0
        super().__init__(clock=lambda: self.now)

    @property
    def codes(self):
        return self._codes

class FakeMailer:
    def __init__(self):
        self.messages = []
    def send_code(self, email, code):
        self.messages.append((email, code))

@pytest.fixture(autouse=True)
def isolated_app(monkeypatch):
    monkeypatch.setattr(settings, 'OTP_DEMO_MODE', False)
    monkeypatch.setattr(settings, 'APP_ENV', 'production')
    monkeypatch.setattr(recovery_module, '_demo_recovery', None)
    def forbidden(*args, **kwargs):
        raise AssertionError('Refusing access to configured application database')
    monkeypatch.setattr(db_module.engine, 'connect', forbidden)
    monkeypatch.setattr(db_module, 'SessionLocal', forbidden)
    engine = create_engine('sqlite+pysqlite:///:memory:', poolclass=StaticPool,
                           connect_args={'check_same_thread': False})
    if engine.dialect.name != 'sqlite' or engine.url.database != ':memory:':
        raise AssertionError('Only private in-memory SQLite is allowed')
    metadata = MetaData()
    for model in (User, Wallet, Notification):
        table = model.__table__.to_metadata(metadata)
        table.c.id.type = Integer()
    metadata.create_all(engine)
    db = Session(engine)
    store, mailer = FakeOTPStore(), FakeMailer()
    recovery = PasswordRecovery(store, mailer, secret='test-only-secret-at-least-32-bytes-long')
    previous = app.dependency_overrides.copy()
    app.dependency_overrides[db_module.get_db] = lambda: db
    app.dependency_overrides[get_password_recovery] = lambda: recovery
    try:
        with TestClient(app) as client:
            yield SimpleNamespace(client=client, db=db, store=store, mailer=mailer)
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
        db.close()
        engine.dispose()

@pytest.fixture
def account(isolated_app):
    user = User(email=EMAIL, password_hash=get_password_hash(PASSWORD), full_name='Test User', role='user')
    isolated_app.db.add(user)
    isolated_app.db.commit()
    isolated_app.user = user
    isolated_app.headers = {'Authorization': f'Bearer {create_access_token(user.id)}'}
    return isolated_app

def change(ctx, new=NEW, old=PASSWORD, **extra):
    return ctx.client.post('/api/v1/auth/change-password', headers=ctx.headers,
        json={'old_password': old, 'new_password': new, 'confirm_password': new, **extra})
def issue(ctx, email=EMAIL):
    return ctx.client.post('/api/v1/auth/forgot-password', json={'email': email})
def reset(ctx, code=None, **extra):
    return ctx.client.post('/api/v1/auth/reset-password', json={'email': EMAIL,
        'reset_code': code or ctx.mailer.messages[-1][1], 'new_password': NEW, 'confirm_password': NEW, **extra})
def notices(ctx):
    return ctx.db.scalars(select(Notification)).all()

def test_1_register_user(isolated_app):
    response = isolated_app.client.post('/api/v1/auth/register', json={'email': EMAIL,
        'password': PASSWORD, 'full_name': 'Test User', 'monthly_income': 15000000})
    assert response.status_code == 201
    assert response.json()['role'] == 'user'
    assert 'password_hash' not in response.json()
    assert isolated_app.db.scalar(select(Wallet)).balance == 15000000

def test_2_register_duplicate_email(account):
    response = account.client.post('/api/v1/auth/register', json={'email': EMAIL, 'password': PASSWORD, 'full_name': 'Duplicate'})
    assert response.status_code == 400
    assert response.json()['detail'] == 'Email này đã được đăng ký.'

def test_3_login_success(account):
    response = account.client.post('/api/v1/auth/login', data={'username': EMAIL, 'password': PASSWORD})
    assert response.status_code == 200
    assert {'access_token', 'refresh_token', 'token_type'} <= response.json().keys()

def test_4_login_wrong_password(account):
    response = account.client.post('/api/v1/auth/login', data={'username': EMAIL, 'password': 'WrongPassword!'})
    assert response.status_code == 400
    assert response.json()['detail'] == 'Sai email hoặc mật khẩu.'

def test_5_get_profile_me(account):
    response = account.client.get('/api/v1/auth/me', headers=account.headers)
    assert response.status_code == 200
    assert response.json()['email'] == EMAIL

def test_6_get_profile_without_token(isolated_app):
    assert isolated_app.client.get('/api/v1/auth/me').status_code == 401

def test_7_change_password(account):
    assert change(account).status_code == 200
    assert verify_password(NEW, account.user.password_hash)
    assert not verify_password(PASSWORD, account.user.password_hash)
    assert notices(account)[0].type == 'password_changed'
    assert account.client.post('/api/v1/auth/login', data={'username': EMAIL, 'password': NEW}).status_code == 200

def test_8_forgot_and_reset_password(account):
    assert issue(account).status_code == 200
    code = account.mailer.messages[-1][1]
    wrong = '000000' if code != '000000' else '111111'
    assert reset(account, wrong).status_code == 400
    assert reset(account, code).status_code == 200
    assert verify_password(NEW, account.user.password_hash)
    assert notices(account)[0].type == 'password_reset'

@pytest.mark.parametrize('password', ['weak', 'abcdefgh1!', 'ABCDEFGH1!', 'Password!', 'Password123', 'Pass word1!', 'A1!' + 'é' * 35])
def test_weak_password_without_write_or_secret_echo(account, password):
    previous = account.user.password_hash
    response = change(account, password)
    assert response.status_code == 422
    assert '"input"' not in response.text
    assert account.user.password_hash == previous
    assert notices(account) == []

@pytest.mark.parametrize('old,new,extra,status', [
    ('WrongPassword1!', NEW, {}, 400), (PASSWORD, PASSWORD, {}, 400),
    (PASSWORD, NEW, {'confirm_password': 'Mismatch1!'}, 422)])
def test_change_validation(account, old, new, extra, status):
    assert change(account, new, old, **extra).status_code == status
    assert verify_password(PASSWORD, account.user.password_hash)
    assert notices(account) == []

def test_confirmation_and_jwt_required(account):
    body = {'old_password': PASSWORD, 'new_password': NEW}
    assert account.client.post('/api/v1/auth/change-password', json=body, headers=account.headers).status_code == 422
    assert account.client.post('/api/v1/auth/change-password', json={**body, 'confirm_password': NEW}).status_code == 401

def test_password_notification_rollback(account, monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError('Simulated notification failure')
    monkeypatch.setattr(notification_repo, 'add_password_notice', fail)
    with pytest.raises(RuntimeError, match='Simulated'):
        change(account)
    account.db.expire_all()
    assert verify_password(PASSWORD, account.user.password_hash)
    assert notices(account) == []

def test_otp_expired(account):
    issue(account)
    account.store.now += 300
    assert reset(account).status_code == 400
    assert verify_password(PASSWORD, account.user.password_hash)

def test_otp_one_use(account):
    issue(account)
    code = account.mailer.messages[-1][1]
    assert reset(account, code).status_code == 200
    assert reset(account, code).status_code == 400
    assert len(notices(account)) == 1

def test_otp_attempt_limit(account):
    issue(account)
    code = account.mailer.messages[-1][1]
    wrong = '000000' if code != '000000' else '111111'
    for _ in range(5):
        assert reset(account, wrong).status_code == 400
    assert reset(account, code).status_code == 400

def test_otp_resend_replaces_old_code(account, monkeypatch):
    values = iter([123456, 654321])
    monkeypatch.setattr('app.services.password_recovery.secrets.randbelow', lambda _: next(values))
    issue(account)
    old = account.mailer.messages[-1][1]
    assert issue(account).status_code == 429
    account.store.now += 60
    assert issue(account).status_code == 200
    assert reset(account, old).status_code == 400
    assert reset(account).status_code == 200

def test_otp_hourly_limit(account):
    for _ in range(5):
        assert issue(account).status_code == 200
        account.store.now += 60
    assert issue(account).status_code == 429

def test_otp_client_limit(account):
    for index in range(20):
        assert issue(account, f'unknown{index}@example.com').status_code == 200
    assert issue(account, 'another@example.com').status_code == 429

def test_otp_no_disclosure_or_plaintext_storage(account, capsys):
    known = issue(account)
    unknown = issue(account, 'unknown@example.com')
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert len(account.mailer.messages) == 1
    code = account.mailer.messages[-1][1]
    assert len(code) == 6 and code.isdigit()
    assert code not in known.text
    assert code not in capsys.readouterr().out
    assert all(code != value[0] for value in account.store.codes.values())

@pytest.mark.parametrize('extra', [{'new_password': 'weak', 'confirm_password': 'weak'},
    {'confirm_password': 'Mismatch1!'}, {'reset_code': 'invalid'}])
def test_reset_validation_before_otp_consumption(account, extra):
    issue(account)
    assert reset(account, **extra).status_code == 422
    assert reset(account).status_code == 200

def test_reset_same_password(account):
    issue(account)
    assert reset(account, new_password=PASSWORD, confirm_password=PASSWORD).status_code == 400
    assert notices(account) == []

def test_reset_rollback_consumes_code_safely(account, monkeypatch):
    issue(account)
    code = account.mailer.messages[-1][1]
    def fail(*args, **kwargs):
        raise RuntimeError('Simulated notification failure')
    monkeypatch.setattr(notification_repo, 'add_password_notice', fail)
    with pytest.raises(RuntimeError, match='Simulated'):
        reset(account, code)
    assert verify_password(PASSWORD, account.user.password_hash)
    assert reset(account, code).status_code == 400

def test_recovery_disabled_without_adapters(account):
    app.dependency_overrides.pop(get_password_recovery)
    assert issue(account).status_code == 503
    assert reset(account, '123456').status_code == 503
    assert account.mailer.messages == []
    assert verify_password(PASSWORD, account.user.password_hash)

def test_notifications_scope_pagination_and_read(account):
    other = User(email='other@example.com', password_hash='unused', role='user')
    account.db.add(other)
    account.db.commit()
    def add(user_id, time):
        item = Notification(user_id=user_id, title='Test', content='Notice', created_at=time)
        account.db.add(item)
        account.db.commit()
        return item
    now = datetime.now(timezone.utc)
    first = add(account.user.id, now - timedelta(days=1))
    second = add(account.user.id, now)
    foreign = add(other.id, now)
    base = '/api/v1/notifications'
    response = account.client.get(f'{base}?page_size=1&user_id={other.id}', headers=account.headers)
    assert response.status_code == 200
    assert response.json()['total'] == 2
    assert response.json()['items'][0]['id'] == second.id
    assert account.client.get(base + '?page_size=1&page=2', headers=account.headers).json()['items'][0]['id'] == first.id
    assert account.client.get(base + '/unread-count', headers=account.headers).json()['unread_count'] == 2
    assert account.client.patch(f'{base}/{foreign.id}/read', headers=account.headers).status_code == 404
    for _ in range(2):
        assert account.client.patch(f'{base}/{second.id}/read', headers=account.headers).json()['is_read'] is True
    assert account.client.get(base + '/unread-count', headers=account.headers).json()['unread_count'] == 1
    assert account.client.patch(base + '/read-all', headers=account.headers).status_code == 200
    assert account.client.get(base + '/unread-count', headers=account.headers).json()['unread_count'] == 0
    account.db.refresh(foreign)
    assert foreign.is_read is False
    assert account.client.patch(base + '/99999/read', headers=account.headers).status_code == 404

@pytest.mark.parametrize('method,path', [('get', ''), ('get', '/unread-count'), ('patch', '/read-all'), ('patch', '/1/read')])
def test_notifications_require_jwt(isolated_app, method, path):
    assert getattr(isolated_app.client, method)('/api/v1/notifications' + path).status_code == 401

@pytest.mark.parametrize('query', ['page=0', 'page_size=101', 'page_size=0'])
def test_notifications_validate_pagination(account, query):
    assert account.client.get('/api/v1/notifications?' + query, headers=account.headers).status_code == 422


@pytest.mark.parametrize('token', ['invalid.jwt.token', create_access_token('999999')])
def test_notifications_reject_invalid_or_unknown_user_jwt(account, token):
    response = account.client.get('/api/v1/notifications', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 401


def test_notifications_reject_expired_jwt(account):
    from jose import jwt
    from app.core.security import SECRET_KEY, ALGORITHM
    token = jwt.encode({'sub': str(account.user.id), 'exp': datetime.now(timezone.utc) - timedelta(minutes=1)},
                       SECRET_KEY, algorithm=ALGORITHM)
    assert account.client.get('/api/v1/notifications', headers={'Authorization': f'Bearer {token}'}).status_code == 401


def test_bcrypt_utf8_boundary(account):
    password = 'Aa1!' + 'é' * 34
    assert len(password.encode('utf-8')) == 72
    assert change(account, password).status_code == 200
    assert verify_password(password, account.user.password_hash)


def test_database_guard_blocks_application_database(isolated_app):
    with pytest.raises(AssertionError, match='Refusing access'):
        db_module.SessionLocal()
    with pytest.raises(AssertionError, match='Refusing access'):
        db_module.engine.connect()


@pytest.mark.parametrize('environment', ['local', 'development'])
def test_demo_end_to_end_with_console_only(account, monkeypatch, capsys, environment):
    monkeypatch.setattr(settings, 'APP_ENV', environment)
    monkeypatch.setattr(settings, 'OTP_DEMO_MODE', True)
    monkeypatch.setattr(recovery_module.secrets, 'randbelow', lambda _: 12345)
    app.dependency_overrides.pop(get_password_recovery)
    response = issue(account)
    assert response.status_code == 200
    assert '012345' not in response.text
    assert '[OTP DEMO - LOCAL ONLY] auth@example.com: 012345' in capsys.readouterr().out
    recovery = get_password_recovery()
    assert get_password_recovery() is recovery
    assert all(record[0] != '012345' for record in recovery.store._codes.values())
    assert issue(account).status_code == 429
    assert reset(account, '012345', confirm_password='Mismatch1!').status_code == 422
    assert reset(account, '012345').status_code == 200
    assert verify_password(NEW, account.user.password_hash)
    assert reset(account, '012345').status_code == 400


@pytest.mark.parametrize('environment', ['production', 'staging', 'prod', ''])
def test_demo_rejected_outside_development(account, monkeypatch, capsys, environment):
    from pydantic import ValidationError
    with pytest.raises(ValidationError, match='requires APP_ENV'):
        Settings(_env_file=None, APP_ENV=environment, OTP_DEMO_MODE=True)
    # Runtime dependency also checks the environment, even if settings were changed.
    monkeypatch.setattr(settings, 'APP_ENV', environment)
    monkeypatch.setattr(settings, 'OTP_DEMO_MODE', True)
    app.dependency_overrides.pop(get_password_recovery)
    assert issue(account).status_code == 503
    assert capsys.readouterr().out == ''


def test_demo_disabled_by_default(isolated_app, monkeypatch):
    monkeypatch.delenv('OTP_DEMO_MODE', raising=False)
    monkeypatch.delenv('APP_ENV', raising=False)
    configured = Settings(_env_file=None)
    assert configured.OTP_DEMO_MODE is False
    assert configured.APP_ENV == 'production'


def test_demo_unknown_email_not_printed(account, monkeypatch, capsys):
    monkeypatch.setattr(settings, 'APP_ENV', 'local')
    monkeypatch.setattr(settings, 'OTP_DEMO_MODE', True)
    app.dependency_overrides.pop(get_password_recovery)
    assert issue(account, 'unknown@example.com').status_code == 200
    assert capsys.readouterr().out == ''


def test_demo_store_atomic_consumption(isolated_app):
    from concurrent.futures import ThreadPoolExecutor
    store = DemoOTPStore()
    store.replace('email', 'digest', 300, 5)
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: store.verify_and_consume('email', 'digest'), range(8)))
    assert results.count(True) == 1


def test_demo_store_atomic_request_limit(isolated_app):
    from concurrent.futures import ThreadPoolExecutor
    store = DemoOTPStore()
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda _: store.allow_request('email', 'client'), range(8)))
    assert results.count(True) == 1


def test_demo_rate_limits_expire_and_cleanup(isolated_app):
    store = FakeOTPStore()
    for _ in range(5):
        assert store.allow_request('email', 'client') is True
        store.now += 60
    assert store.allow_request('email', 'client') is False
    store.replace('expired', 'digest', 300, 5)
    store.now = 3600
    assert store.allow_request('email', 'client') is True
    assert 'expired' not in store.codes


def test_demo_reset_failure_requires_new_code(account, monkeypatch, capsys):
    monkeypatch.setattr(settings, 'APP_ENV', 'local')
    monkeypatch.setattr(settings, 'OTP_DEMO_MODE', True)
    monkeypatch.setattr(recovery_module.secrets, 'randbelow', lambda _: 123456)
    app.dependency_overrides.pop(get_password_recovery)
    assert issue(account).status_code == 200
    capsys.readouterr()
    def fail(*args, **kwargs):
        raise RuntimeError('Simulated persistence failure')
    # Only simulate a reset failure; no change to notification implementation.
    monkeypatch.setattr(notification_repo, 'add_password_notice', fail)
    with pytest.raises(RuntimeError, match='Simulated persistence'):
        reset(account, '123456')
    assert verify_password(PASSWORD, account.user.password_hash)
    assert reset(account, '123456').status_code == 400
