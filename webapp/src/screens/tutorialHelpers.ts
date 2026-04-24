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

type CaptionRule = Readonly<{
  match: string[];
  caption: string;
}>;

const helpCaptionRules: CaptionRule[] = [
  { match: ['registerbadpasswd', 'registererrorpswd'], caption: 'tutorial.caption_register_error_pswd' },
  { match: ['registerbad'], caption: 'tutorial.caption_register_empty_space' },
  { match: ['registerblank', 'registerempty'], caption: 'tutorial.caption_register_empty' },
  { match: ['registergood'], caption: 'tutorial.caption_register_good' },
  { match: ['settings'], caption: 'tutorial.caption_settings' },
  { match: ['idioma', 'language'], caption: 'tutorial.caption_language' },
  { match: ['helphome'], caption: 'tutorial.window_home' },
  { match: ['helpregister'], caption: 'tutorial.window_register' },
  { match: ['helplogin'], caption: 'tutorial.window_login' },
  { match: ['helpgame'], caption: 'tutorial.window_game' },
  { match: ['home'], caption: 'tutorial.caption_home' },
  { match: ['loginerrorbadusernamepswd', 'loginerrordata'], caption: 'tutorial.caption_login_error_data' },
  { match: ['loginerrorserver'], caption: 'tutorial.caption_login_error_server' },
  { match: ['logingood'], caption: 'tutorial.caption_login_good' },
  { match: ['loginblank'], caption: 'tutorial.caption_login_empty' },
  { match: ['gamenav'], caption: 'tutorial.caption_game_nav' },
  { match: ['gamepoints'], caption: 'tutorial.caption_game_points' },
  { match: ['gamesize'], caption: 'tutorial.caption_game_size' },
  { match: ['gamedifficult'], caption: 'tutorial.caption_game_difficulty' },
  { match: ['gametemporizator'], caption: 'tutorial.caption_game_timer' },
  { match: ['gameingame'], caption: 'tutorial.caption_game_board' },
  { match: ['gameviewmyprofile'], caption: 'tutorial.caption_game_profile' },
  { match: ['gamefriends'], caption: 'tutorial.caption_game_friends' },
  { match: ['gamehistorial'], caption: 'tutorial.caption_game_history' },
  { match: ['gameended'], caption: 'tutorial.caption_game_ended' },
  { match: ['gamewin'], caption: 'tutorial.caption_game_win' },
  { match: ['gamelose'], caption: 'tutorial.caption_game_lose' },
];

export const getHelpCaption = (imageName: string) => {
  const normalized = imageName.toLowerCase();
  const matchedRule = helpCaptionRules.find((rule) => rule.match.some((fragment) => normalized.includes(fragment)));
  return matchedRule ? i18n.t(matchedRule.caption) : imageName;
};

export const homeImages = pickImageByName('home.png');
export const helpHomeImages = pickImageByName('helpHome.png');
export const helpGameImages = pickImageByName('helpGame.png');
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
export const gameNavImages = pickImageByName('gameNav.png');
export const gamePointsImages = pickImageByName('gamePoints.png');
export const gameSizeImages = pickImageByName('gameSize.png');
export const gameDifficultImages = pickImageByName('gameDifficult.png');
export const gameTemporizatorImages = pickImageByName('gameTemporizator.png');
export const gameInGameImages = pickImageByName('gameInGame.png');
export const gameViewMyProfileImages = pickImageByName('gameViewMyProfile.png');
export const gameFriendsImages = pickImageByName('gameFriends.png');
export const gameHistorialImages = pickImageByName('gameHistorial.png');
export const gameEndedImages = pickImageByName('gameEnded.png');
export const gameWinImages = pickImageByName('gameWin.png');
export const gameLoseImages = pickImageByName('gameLose.png');
