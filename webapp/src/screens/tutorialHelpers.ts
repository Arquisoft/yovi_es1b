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

  if (normalized.includes('registeremptyspace')) return 'Campos vacíos';
  if (normalized.includes('registerempty')) return 'Formulario vacío';
  if (normalized.includes('registererrorpswd')) return 'Error de contraseña';
  if (normalized.includes('registergood')) return 'Formulario correcto';
  if (normalized.includes('settings')) return 'Ajustes';
  if (normalized.includes('home')) return 'Pantalla de inicio';

  return imageName;
};

export const homeImages = pickImageByName('home.png');
export const registerEmptyImages = pickImageByName('registerEmpty.png');
export const registerEmptySpaceImages = pickImageByName('registerEmptySpace.png');
export const registerErrorPswdImages = pickImageByName('registerErrorPswd.png');
export const registerGoodImages = pickImageByName('registerGood.png');
export const settingsImages = pickImageByName('settings.png');
export const loginEmptyImages = pickImageByName('loginEmpty.png');
export const loginErrorDataImages = pickImageByName('loginErrorData.png');
export const loginErrorServerImages = pickImageByName('loginErrorServer.png');
export const loginGoodImages = pickImageByName('loginGood.png');
