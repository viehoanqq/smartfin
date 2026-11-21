export const PASSWORD_HINT = 'Ít nhất 8 ký tự, tối đa 72 byte UTF-8; có chữ hoa, chữ thường, số, ký tự đặc biệt; không có khoảng trắng.';

export function passwordError(password) {
  if (Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72
    || /\s/u.test(password) || !/\p{Lu}/u.test(password) || !/\p{Ll}/u.test(password)
    || !/\p{Nd}/u.test(password) || !/[^\p{L}\p{N}\s]/u.test(password)) return PASSWORD_HINT;
  return '';
}

export function authError(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || 'Dữ liệu chưa hợp lệ.').join(' | ');
  return fallback;
}
