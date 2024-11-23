module.exports = {
	packagerConfig: {
		appCopyright: 'Copyright © 2024 foxypiratecove37350',
		appBundleId: 'com.foxypiratecove37350.bingchat',
		icon: 'icon',
		platforms: ['darwin', 'linux', 'win32'],
		arch: ['x64', 'arm64'],
		asar: true,
	},
	rebuildConfig: {},
	makers: [
		{
			name: '@electron-forge/maker-squirrel',
			config: {
				iconUrl: 'https://github.com/foxypiratecove37350/BingChat/raw/main/icon.ico',
				setupIcon: 'icon.ico',
				authors: 'foxypiratecove37350',
				description: 'AI-powered copilot',
			},
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['darwin', 'win32'],
		},
		{
			name: '@electron-forge/maker-dmg',
			config: {
				icon: 'icon.icns',
				background: 'bg.png',
				overwrite: true,
			},
		},
		{
			name: '@electron-forge/maker-deb',
			config: {
				options: {
					executableName: 'BingChat',
					name: 'bing-chat',
					productName: 'Bing Chat',
					description: 'AI-powered copilot',
					productDescription: 'AI-powered copilot',
					version: '0.3.8',
					categories: ['Utility'],
					maintainer: 'foxypiratecove37350',
					homepage: 'https://github.com/foxypiratecove37350/BingChat',
					icon: 'icon.png',
				},
			},
		},
		{
			name: '@electron-forge/maker-rpm',
			config: {
				options: {
					executableName: 'BingChat',
					name: 'bing-chat',
					productName: 'Bing Chat',
					description: 'AI-powered copilot',
					productDescription: 'AI-powered copilot',
					version: '0.3.8',
					categories: ['Utility'],
					maintainer: 'foxypiratecove37350',
					homepage: 'https://github.com/foxypiratecove37350/BingChat',
					icon: 'icon.png',
				},
			},
		},
	],
}
