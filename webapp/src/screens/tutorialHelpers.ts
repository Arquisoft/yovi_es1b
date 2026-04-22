import i18n from '../i18n';
const helpImageModules = import.meta.glob('../assets/help/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

export const allHelpImages = Object.entries(helpImageModules).map(([path, src]) => ({
  id: path,
  src,
  name: path.substring(path.lastIndexOf('/') + 1),
}));

export const pickImageByName = (fileName: string) =>
  allHelpImages.filter((image) => image.name.toLowerCase() === fileName.toLowerCase());

export const getHelpCaption = (imageName: string) => {
  const normalized = imageName.toLowerCase();

  if (normalized.includes('registerbadpasswd') || normalized.includes('registererrorpswd')) {
    return i18n.t('tutorial.caption_register_error_pswd');
  }
  if (normalized.includes('registerbad')) return i18n.t('tutorial.caption_register_empty_space');
  if (normalized.includes('registerblank') || normalized.includes('registerempty')) {
    return i18n.t('tutorial.caption_register_empty');
  }
  if (normalized.includes('registergood')) return i18n.t('tutorial.caption_register_good');
  if (normalized.includes('settings')) return i18n.t('tutorial.caption_settings');
  if (normalized.includes('idioma') || normalized.includes('language')) return i18n.t('tutorial.caption_language');
  if (normalized.includes('helphome')) return i18n.t('tutorial.window_home');
  if (normalized.includes('helpregister')) return i18n.t('tutorial.window_register');
  if (normalized.includes('helplogin')) return i18n.t('tutorial.window_login');
  if (normalized.includes('home')) return i18n.t('tutorial.caption_home');
  if (normalized.includes('loginerrorbadusernamepswd') || normalized.includes('loginerrordata')) {
    return i18n.t('tutorial.caption_login_error_data');
  }
  if (normalized.includes('loginerrorserver')) return i18n.t('tutorial.caption_login_error_server');
  if (normalized.includes('logingood')) return i18n.t('tutorial.caption_login_good');
  if (normalized.includes('loginblank')) return i18n.t('tutorial.caption_login_empty');

  return imageName;
};

export const homeImages = pickImageByName('home.png');
export const helpHomeImages = pickImageByName('helpHome.png');
export const languageImages = pickImageByName('idiomaButton.png');
export const registerBlankImages = pickImageByName('registerBlank.png');
export const registerBadImages = pickImageByName('registerBad.png');
export const registerBadPasswdImages = pickImageByName('registerBadPasswd.png');
export const registerGoodImages = pickImageByName('registerGood.png');
export const helpRegisterImages = pickImageByName('helpRegister.png');
export const settingsImages = pickImageByName('settings.png');
export const loginBlankImages = pickImageByName('loginBlank.png');
export const loginErrorBadUsernamePswdImages = pickImageByName('loginErrorBadUsernamePswd.png');
export const loginErrorServerImages = pickImageByName('loginErrorServer.png');
export const loginGoodImages = pickImageByName('loginGood.png');
export const helpLoginImages = pickImageByName('helpLogin.png');
