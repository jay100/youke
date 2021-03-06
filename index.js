const electron = require('electron');
const app = electron.app;
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
const dialog = electron.dialog;

const log = require('electron-log');
const {autoUpdater} = require("electron-updater");

const path = require('path');

//指定 flash 路径，假定它与 main.js 放在同一目录中。
let pluginName;

let pkg = require('./package.json')

autoUpdater.autoDownload = false;

switch (process.platform) {
  case 'win32':
    pluginName = 'pepflashplayer64_28_0_0_126.dll';
    break;
  case 'darwin':
    pluginName = 'PepperFlashPlayer.plugin';
    break;
  case 'linux':
    pluginName = 'libpepflashplayer.so';
    break;
}
app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, pluginName));

// 可选：指定 flash 的版本，例如 v17.0.0.169
app.commandLine.appendSwitch('ppapi-flash-version', '28.0.0.126')//哈哈哈 有点延时

const Tray = electron.Tray;
const Menu = electron.Menu;

var mainWindow = null;
var loadWindow =null;

function sendStatusToWindow(type,text) {
  log.info(text);
  let message = type+'____'+text;
  mainWindow.webContents.send('message', message);
}

autoUpdater.on('checking-for-update', () => {
  sendStatusToWindow('checking-for-update','正在检查更新...');
})
autoUpdater.on('update-available', (info) => {
  sendStatusToWindow('update-available',JSON.stringify(info));
  //开始下载
  autoUpdater.downloadUpdate();
})
autoUpdater.on('update-not-available', (info) => {
  sendStatusToWindow('update-not-available',JSON.stringify(info));
})
autoUpdater.on('error', (err) => {
  sendStatusToWindow('error',err);
})
autoUpdater.on('download-progress', (progressObj) => {
 /* let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';*/
 // sendStatusToWindow(log_message);
  sendStatusToWindow('download-progress',JSON.stringify(progressObj));

})
autoUpdater.on('update-downloaded', (info) => {
  sendStatusToWindow('update-downloaded',JSON.stringify(info));
  setTimeout(()=>{
    autoUpdater.quitAndInstall()
  },2000);
});


app.on('window-all-closed', function(){
  if(process.platform != 'darwin'){
    app.quit();
  }
});

//var url = 'file://' + __dirname + '/dist/index.html?';

//var url = 'http://localhost:8080';
//var url = 'https://192.168.2.75:8080';
var url = 'https://city.youkeup.com/desktop/index.html?v='+new Date().getTime();

// 关键代码在这里
const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
		mainWindow.show()
    mainWindow.focus()
  }
})
if (shouldQuit) {
  app.quit()
}

app.on('ready', function(){

  var tray = new Tray(__dirname+'/icon16x16.png');
  const contextMenu = Menu.buildFromTemplate([

    {label: '重新加载', click:(i,b,e)=>{mainWindow.reload()}},
    {type:'separator'},
    {label: '退出', role: 'quit'},
  ])
  tray.setToolTip('有课PC端')
  tray.setContextMenu(contextMenu)




  //mainWindow = new BrowserWindow({width:1280, height:720});
  mainWindow = new BrowserWindow({
    width: 400,
    height: 800,
    show:false,
    frame: false,
    maximizable:true,
    webPreferences:{plugins:true}
  })
  mainWindow.center();
  mainWindow.loadURL(url);
  //mainWindow.openDevTools();
  mainWindow.on('closed', function(){
    mainWindow = null;
  });



  mainWindow.on('unresponsive',function () {
    dialog.showErrorBox('系统错误','无法加载资源');
    //mainWindow.loadURL('file://'+__dirname+'/notFound.html');



  });

  mainWindow.on('show', () => {
    tray.setHighlightMode('always')
  })
  mainWindow.on('hide', () => {
    tray.setHighlightMode('never')
  })

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })

  loadWindow =  new BrowserWindow({
    width: 450,
    height: 300,
    show:true,
    transparent:true,
    frame: false,
    resizable: false,
    webPreferences:{plugins:true}
  });
  loadWindow.loadURL('file://'+__dirname+'/welcome.html');
  //loadWindow.openDevTools();


  ipcMain.on('finished-loading-dictinoary', function(event, args) {
    loadWindow.close();
    mainWindow.show();
  });


  ipcMain.on('window-all-closed', () => {
    app.quit();
  });



  //小化
  ipcMain.on('hide-window', () => {
    mainWindow.minimize();
  });
//最大化
  ipcMain.on('show-window', () => {
    mainWindow.maximize();
  });
//还原
  ipcMain.on('orignal-window', () => {
    mainWindow.unmaximize();
  });

  ipcMain.on('is-max-window', (event) => {
    return mainWindow.isFullScreenable();
  });

  ipcMain.on('check-for-update', (event) => {
    autoUpdater.checkForUpdates();
  });

  ipcMain.on('get-package-info', (event) => {
    event.sender.send('rec-package-info',JSON.stringify(pkg));
  });



});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault()
  callback(true)
});


