const {
	app,
	shell,
	nativeTheme,
	dialog,
	ipcMain,
	Menu,
	BrowserWindow,
} = require('electron')
const contextMenu = require('electron-context-menu')
const prompt = require('electron-prompt')
const Store = require('electron-store')
const path = require('path')
const fs = require('fs')

if (require('electron-squirrel-startup')) app.quit()

const configSchema = {
	theme: {
		enum: ['system', 'light', 'dark'],
		default: 'system',
	},
	fontSize: {
		enum: [1, 1.15, 1.3, 1.45],
		default: 1,
	},
	alwaysOnTop: {
		type: 'boolean',
		default: false,
	},
}
const config = new Store({ schema: configSchema, clearInvalidConfig: true })

const createWindow = () => {
	// Get theme settings
	const theme = config.get('theme')
	const isDarkMode =
		theme === 'system'
			? nativeTheme.shouldUseDarkColors
			: theme === 'dark'
			? true
			: false
	// Create window
	const mainWindow = new BrowserWindow({
		title: 'Bing Chat',
		backgroundColor: isDarkMode ? '#1c1c1c' : '#fefcfb',
		icon: 'icon.png',
		width: 385,
		height: 597,
		titleBarStyle: 'hidden',
		titleBarOverlay: true,
		titleBarOverlay: {
			color: isDarkMode ? '#0c101c' : '#ffffff',
			symbolColor: isDarkMode ? '#f2ddcc' : '#282523',
		},
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			devTools: false,
			nodeIntegration: true,
		},
	})
	// Get always on top settings
	const alwaysOnTop = config.get('alwaysOnTop')
	mainWindow.setAlwaysOnTop(alwaysOnTop)
	// Hide main menu (Windows)
	Menu.setApplicationMenu(null)
	// Create context menu
	contextMenu({
		window: mainWindow.webContents,
		showServices: true,
		showSelectAll: false,
		append: (defaultActions, parameters, browserWindow) => [
			{
				label: 'Reload',
				visible: parameters.selectionText.trim().length === 0,
				click: () => {
					reloadHandler()
				},
			},
			{
				label: 'Export',
				visible: parameters.selectionText.trim().length === 0,
				submenu: [
					{
						label: 'Markdown',
						click() {
							mainWindow.webContents.send('export', 'md', isDarkMode)
						},
					},
					{
						label: 'PNG',
						click() {
							mainWindow.webContents.send('export', 'png', isDarkMode)
						},
					},
					{
						label: 'PDF',
						click() {
							mainWindow.webContents.send('export', 'pdf', isDarkMode)
						},
					},
				],
			},
			{
				type: 'separator',
				visible: parameters.selectionText.trim().length === 0,
			},
			{
				label: 'Always on Top',
				type: 'checkbox',
				checked: mainWindow.isAlwaysOnTop() ? true : false,
				visible: parameters.selectionText.trim().length === 0,
				click: () => alwaysOnTopHandler(),
			},
			{
				type: 'separator',
				visible: parameters.selectionText.trim().length === 0,
			},
			{
				label: 'Appearance',
				visible: parameters.selectionText.trim().length === 0,
				submenu: [
					{
						label: 'Theme',
						submenu: [
							{
								label: 'System',
								type: 'radio',
								checked: config.get('theme') === 'system',
								click() {
									themeHandler('system')
								},
							},
							{
								label: 'Light',
								type: 'radio',
								checked: config.get('theme') === 'light',
								click() {
									themeHandler('light')
								},
							},
							{
								label: 'Dark',
								type: 'radio',
								checked: config.get('theme') === 'dark',
								click() {
									themeHandler('dark')
								},
							},
						],
					},
					{
						label: 'Font Size',
						submenu: [
							{
								label: 'Default',
								type: 'radio',
								checked: config.get('fontSize') === 1,
								click() {
									fontSizeHandler(1)
								},
							},
							{
								label: 'Medium',
								type: 'radio',
								checked: config.get('fontSize') === 1.15,
								click() {
									fontSizeHandler(1.15)
								},
							},
							{
								label: 'Large',
								type: 'radio',
								checked: config.get('fontSize') === 1.3,
								click() {
									fontSizeHandler(1.3)
								},
							},
							{
								label: 'Extra Large',
								type: 'radio',
								checked: config.get('fontSize') === 1.45,
								click() {
									fontSizeHandler(1.45)
								},
							},
						],
					},
				],
			},
			{
				type: 'separator',
				visible: parameters.selectionText.trim().length === 0,
			},
			{
				label: 'Reset',
				visible: parameters.selectionText.trim().length === 0,
				click: () => {
					mainWindow.webContents.session.clearStorageData().then(() => {
						mainWindow.reload()
					})
				},
			},
			{
				type: 'separator',
				visible: parameters.selectionText.trim().length === 0,
			},
			{
				label: 'Feedback',
				visible: parameters.selectionText.trim().length === 0,
				click: () => {
					shell.openExternal('https://github.com/foxypiratecove37350/BingChat/issues')
				},
			},
			{
				label: 'Bing Chat v0.3.8',
				visible: parameters.selectionText.trim().length === 0,
				click: () => {
					shell.openExternal('https://github.com/foxypiratecove37350/BingChat/releases/v0.3.8')
				},
			},
		],
	})
	// Load Bing
	const bingUrl = "https://copilot.microsoft.com/"
	mainWindow.loadURL(bingUrl)
	// Open links in default browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url)
		return { action: 'deny' }
	})
	// Modify Content Security Policy
	mainWindow.webContents.session.webRequest.onHeadersReceived(
		(details, callback) => {
			let responseHeaders = details.responseHeaders
			const CSP = responseHeaders['content-security-policy']
			if (details.url === bingUrl && CSP) {
				responseHeaders['content-security-policy'] = CSP[0]
					.replace(`require-trusted-types-for 'script'`, '')
					.replace('report-to csp-endpoint', '')
				callback({
					cancel: false,
					responseHeaders,
				})
			} else {
				return callback({ cancel: false })
			}
		}
	)
	// Always on top
	const alwaysOnTopHandler = () => {
		config.set('alwaysOnTop', !mainWindow.isAlwaysOnTop())
		mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop())
	}
	// Theme
	const themeHandler = (newTheme) => {
		config.set('theme', newTheme)
		if (newTheme === 'system') {
			newTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
		}

		let isDarkMode = newTheme === 'dark'

		mainWindow.setTitleBarOverlay({
			color: isDarkMode ? '#0c101c' : '#ffffff',
			symbolColor: isDarkMode ? '#f2ddcc' : '#282523',
		})

		mainWindow.webContents.send('switch-theme', newTheme)
	}
	// Font size
	const fontSizeHandler = (newSize) => {
		config.set('fontSize', newSize)
		mainWindow.webContents.send('set-font-size', newSize)
	}
	// Reload
	const reloadHandler = () => {
		dialog.showMessageBox(mainWindow, {
			type: 'question',
			buttons: ['No', 'Yes'],
			message: 'Reload',
			detail: 'Are you sure you want to reload Bing Chat?',
		})
		.then((result) => {
			if (result.response === 1) {
				mainWindow.reload()
			}
		})
	}
	// Shortcuts
	mainWindow.webContents.on('before-input-event', (event, input) => {
		const cmdKey = process.platform === 'darwin' ? input.meta : input.control
		if (cmdKey) {
			switch (input.code) {
				case 'KeyN':
					mainWindow.webContents.send('new-chat')
					event.preventDefault()
					break
				case 'KeyR':
					reloadHandler()
					event.preventDefault()
					break
				case 'KeyT':
					alwaysOnTopHandler()
					event.preventDefault()
					break
				case 'KeyI':
					mainWindow.webContents.send('focus-on-textarea')
					event.preventDefault()
					break
				case 'NumpadAdd':
				case 'Equal': {
					let newIndex = configSchema.fontSize.enum.indexOf(config.get('fontSize')) + 1
					if (newIndex < configSchema.fontSize.enum.length) {
						fontSizeHandler(configSchema.fontSize.enum[newIndex])
						event.preventDefault()
					}
					break
				}
				case 'NumpadSubtract':
				case 'Minus': {
					let newIndex = configSchema.fontSize.enum.indexOf(config.get('fontSize')) - 1
					if (newIndex >= 0) {
						fontSizeHandler(configSchema.fontSize.enum[newIndex])
						event.preventDefault()
					}
					break
				}
				default:
					break
			}
		}
	})
}

app.whenReady().then(() => {
	// Save to file
	ipcMain.on('export-data', (event, format, dataURL) => {
		if (format) {
			const fileName = `BingChat-${Math.floor(Date.now() / 1000)}.${format}`
			let filters
			switch (format) {
				case 'md':
					filters = [{ name: 'Markdown', extensions: ['md'] }]
					break
				case 'png':
					filters = [{ name: 'Image', extensions: ['png'] }]
					break
				case 'pdf':
					filters = [{ name: 'PDF', extensions: ['pdf'] }]
			}
			dialog
				.showSaveDialog(BrowserWindow.getAllWindows()[0], {
					title: 'Export',
					defaultPath: fileName,
					filters: filters,
				})
				.then((result) => {
					if (!result.canceled) {
						const filePath = result.filePath
						const data = dataURL.replace(/^data:\S+;base64,/, '')
						fs.writeFile(filePath, data, 'base64', (err) => {
							if (err) {
								dialog.showMessageBox({
									type: 'info',
									message: 'Error',
									detail: err,
								})
							}
						})
					}
				})
		}
	})
	// Init style
	ipcMain.on('init-style', () => {
		const fontSize = config.get('fontSize')
		setTimeout(() => {
			if (fontSize !== 1) {
				BrowserWindow.getAllWindows()[0].webContents.send(
					'set-font-size',
					fontSize
				)
			}
			BrowserWindow.getAllWindows()[0].webContents.send('set-initial-style')
		}, 1000)
	})
	// Error message
	ipcMain.on('error', (event, detail) => {
		dialog.showMessageBox({
			type: 'info',
			message: 'Error',
			detail: detail,
		})
	})
	// Change the title bar overlay color when the theme is changed in the UI
	ipcMain.on('update-theme', (event, newTheme) => {
		config.set('theme', newTheme)
		if (newTheme === 'system') {
			newTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
		}

		let isDarkMode = newTheme === 'dark'

		BrowserWindow.getAllWindows()[0].setTitleBarOverlay({
			color: isDarkMode ? '#0c101c' : '#ffffff',
			symbolColor: isDarkMode ? '#f2ddcc' : '#282523',
		})
	})
	createWindow()
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
