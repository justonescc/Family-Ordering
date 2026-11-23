/**
 * 业务错误码分段：
 * 1xxx 账号/家庭，2xxx 菜单，3xxx 餐次，4xxx 点菜，9xxx 系统
 */
export const ErrorCode = {
  // 账号 / 家庭
  USER_EXISTS: 1001,
  INVALID_CREDENTIALS: 1002,
  FAMILY_PASSPHRASE_TAKEN: 1003,
  FAMILY_NOT_FOUND: 1004,
  PASSPHRASE_WRONG: 1005,
  NICKNAME_TAKEN: 1006,
  WECHAT_NOT_CONFIGURED: 1007,
  WECHAT_LOGIN_FAILED: 1008,
  // 菜单
  CATEGORY_NOT_FOUND: 2001,
  CATEGORY_HAS_DISHES: 2002,
  CATEGORY_DUPLICATE: 2003,
  DISH_NOT_FOUND: 2004,
  DISH_DUPLICATE: 2005,
  DISH_REORDER_INVALID: 2006,
  // 餐次
  MEAL_NOT_FOUND: 3001,
  MEAL_TIME_INVALID: 3002,
  MEAL_DUPLICATE: 3003,
  // 点菜
  ORDER_ITEM_NOT_FOUND: 4001,
  QTY_INVALID: 4002,
  NOT_YOUR_ITEM: 4003,
  // 系统
  INTERNAL: 9000,
  NOT_FOUND: 9001,
  UNAUTHORIZED: 9002,
  FORBIDDEN: 9003,
  VALIDATION: 9004,
  RATE_LIMITED: 9005,
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errors = {
  userExists: () => new AppError(ErrorCode.USER_EXISTS, '用户名已被注册', 409),
  invalidCredentials: () =>
    new AppError(ErrorCode.INVALID_CREDENTIALS, '用户名或密码错误', 401),
  familyPassphraseTaken: () =>
    new AppError(ErrorCode.FAMILY_PASSPHRASE_TAKEN, '该家庭口令已被使用', 409),
  familyNotFound: () => new AppError(ErrorCode.FAMILY_NOT_FOUND, '家庭不存在', 404),
  passphraseWrong: () =>
    new AppError(ErrorCode.PASSPHRASE_WRONG, '家庭口令错误', 401),
  nicknameTaken: () =>
    new AppError(ErrorCode.NICKNAME_TAKEN, '该昵称在本家庭中已被使用', 409),
  wechatNotConfigured: () =>
    new AppError(ErrorCode.WECHAT_NOT_CONFIGURED, '微信登录未配置（缺少 AppID/Secret）', 503),
  wechatLoginFailed: (message?: string) =>
    new AppError(ErrorCode.WECHAT_LOGIN_FAILED, message || '微信登录失败', 401),
  categoryNotFound: () =>
    new AppError(ErrorCode.CATEGORY_NOT_FOUND, '分类不存在', 404),
  categoryHasDishes: () =>
    new AppError(ErrorCode.CATEGORY_HAS_DISHES, '分类下还有菜品，无法删除', 409),
  categoryDuplicate: () =>
    new AppError(ErrorCode.CATEGORY_DUPLICATE, '分类名已存在', 409),
  dishNotFound: () => new AppError(ErrorCode.DISH_NOT_FOUND, '菜品不存在', 404),
  dishDuplicate: () => new AppError(ErrorCode.DISH_DUPLICATE, '同分类下菜品名已存在', 409),
  dishReorderInvalid: () =>
    new AppError(ErrorCode.DISH_REORDER_INVALID, '重排需针对同一分类内的菜品', 400),
  mealNotFound: () => new AppError(ErrorCode.MEAL_NOT_FOUND, '餐次不存在', 404),
  mealTimeInvalid: () =>
    new AppError(ErrorCode.MEAL_TIME_INVALID, '餐次时间格式应为 HH:mm', 400),
  mealDuplicate: () => new AppError(ErrorCode.MEAL_DUPLICATE, '餐次名已存在', 409),
  orderItemNotFound: () =>
    new AppError(ErrorCode.ORDER_ITEM_NOT_FOUND, '点菜记录不存在', 404),
  qtyInvalid: () => new AppError(ErrorCode.QTY_INVALID, '份数必须为 1-99', 400),
  notYourItem: () => new AppError(ErrorCode.NOT_YOUR_ITEM, '只能操作自己的点菜记录', 403),
  lastAdmin: () => new AppError(ErrorCode.FORBIDDEN, '不能降级家庭中唯一的管理员', 409),
  unauthorized: () => new AppError(ErrorCode.UNAUTHORIZED, '请先登录', 401),
  forbidden: () => new AppError(ErrorCode.FORBIDDEN, '没有权限执行此操作', 403),
  notFound: (path: string) =>
    new AppError(ErrorCode.NOT_FOUND, `接口不存在: ${path}`, 404),
  internal: () => new AppError(ErrorCode.INTERNAL, '服务器内部错误', 500),
};
