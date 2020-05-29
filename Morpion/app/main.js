const {app, BrowserWindow} = require('electron')
const path = require('path')

function createWindow () {
  // Création de la fenêtre
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

  // chargement de l'index.html (base d'accueil)
  mainWindow.loadFile('./public/index.html')

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// Méthode appelé lorsque la fenêtre Electron à terminée son chargement
app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quitter lorsque toutes les feneêtre sont fermées
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})