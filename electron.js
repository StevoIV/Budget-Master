const { app, BrowserWindow } = require('electron');
const path = require('path');

// Check if we are running in development mode
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'public/favicon.ico') // Ensure you have an icon or remove this line
  });

  if (isDev) {
    // Development: Load from Vite server
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Optional: Open dev tools
  } else {
    // Production: Load built files
    // IMPORTANT: We load from the current directory's dist folder
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});