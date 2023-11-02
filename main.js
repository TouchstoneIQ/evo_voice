const electronApp = require('electron').app;
const electronBrowserWindow = require('electron').BrowserWindow;
const electronIpcMain = require('electron').ipcMain;
const { Notification } = require("electron");
const nodePath = require("path");

if (handleSquirrelEvent(electronApp)) {
    // squirrel event handled and app will exit in 1000ms, so don't do anything else
    return;
};


var incomingCall = '';

// Prevent garbage collection
let window;

function createWindow() {
    return new electronBrowserWindow({
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: nodePath.join(__dirname, 'preload.js')
        }
    });
}

function showMainWindow() {
    window.loadFile('index.html')
        .then(() => { window.show(); })

        //
}

function showLoginWindow() {
    var url = 'https://v3.hostedsuite.com/dashboard/#/console';
    //var url = 'https://console.evovoice.io/login?Customer=touchstoneiq';
    
    window.loadURL(url)
        .then(() => { window.show(); })

    const contents = window.webContents.on("console-message", (ev, level, message, line, file) => {
        // we need to capture incoming caller id and called number messages before the ringing sound is played
        var calledNumberPattern = new RegExp('popping new call with dialed number.*');

        if (calledNumberPattern.test(message)) {
            var calledNumber = calledNumberPattern.exec(message);
            incomingCall = calledNumber['input'].replace(/^\D+/g, '');
        }
    
        if (message == 'PLAYING RING') {
            alertUser();
        }
    });
}

electronApp.on('ready', () => {
    window = createWindow();
    //showMainWindow();
    showLoginWindow();
});

electronApp.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electronApp.quit();
    }
});

electronApp.on('activate', () => {
    if (electronBrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// ----- IPC -----

electronIpcMain.on('message:loginShow', (event) => {
    showLoginWindow();
})

electronIpcMain.on('message:loginSuccessful', (event, session) => {
    showMainWindow();
})

function alertUser() {
    const supportLines = [
        { number: '18445364528', label: 'Denver Helpdesk' },
        { number: '18448118785', label: 'Boulder Helpdesk' },
        { number: '17207021584', label: 'Fort Collins Helpdesk' },
        { number: '18885130353', label: 'Colorado Helpdesk' },
        { number: '17866613208', label: 'Miami Helpdesk' },
        { number: '18666147542', label: 'EBC Helpdesk' }, 
        { number: '18087361077', label: 'Honolulu Helpdesk'}
    ];

    let caller = supportLines.find(sl => sl.number === incomingCall);
    
    if (!caller) {
        var name = 'Direct Call';
    } else {
        var name = caller.label;
    }

    new Notification({
        title: "Incoming Call for "+name,
        body: "Incoming call for "+name,
    }).show();
}

//installer code
function handleSquirrelEvent(application) {
    if (process.argv.length === 1) {
        return false;
    }

    const ChildProcess = require('child_process');
    const path = require('path');

    const appFolder = path.resolve(process.execPath, '..');
    const rootAtomFolder = path.resolve(appFolder, '..');
    const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
    const exeName = path.basename(process.execPath);

    const spawn = function(command, args) {
        let spawnedProcess, error;

        try {
            spawnedProcess = ChildProcess.spawn(command, args, {
                detached: true
            });
        } catch (error) {}

        return spawnedProcess;
    };

    const spawnUpdate = function(args) {
        return spawn(updateDotExe, args);
    };

    const squirrelEvent = process.argv[1];
    switch (squirrelEvent) {
        case '--squirrel-install':
        case '--squirrel-updated':
            // Optionally do things such as:
            // - Add your .exe to the PATH
            // - Write to the registry for things like file associations and
            //   explorer context menus

            // Install desktop and start menu shortcuts
            spawnUpdate(['--createShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-uninstall':
            // Undo anything you did in the --squirrel-install and
            // --squirrel-updated handlers

            // Remove desktop and start menu shortcuts
            spawnUpdate(['--removeShortcut', exeName]);

            setTimeout(application.quit, 1000);
            return true;

        case '--squirrel-obsolete':
            // This is called on the outgoing version of your app before
            // we update to the new version - it's the opposite of
            // --squirrel-updated

            application.quit();
            return true;
    }
};