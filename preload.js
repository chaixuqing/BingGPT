const { ipcRenderer } = require('electron')
const html2canvas = require('html2canvas')
const { jsPDF } = require('jspdf')
const TurndownService = require('turndown')

window.addEventListener('DOMContentLoaded', () => {
	// Change page title
	document.title = 'Bing Chat'
	// Body
	const body = document.body
	if (body) {
		body.style.cssText = 'width: 100%; max-width: 100%; overflow: hidden;'
		// Title bar
		const titleBar = document.createElement('div')
		titleBar.id = 'titleBar'
		titleBar.style.cssText =
			'position: fixed; top: 0px; height: 32px; width: 100%; -webkit-user-select: none; -webkit-app-region: drag; z-index: 50; background-color: var(--color-background-100);'
		body.prepend(titleBar)
		const style = document.createElement('style')
		style.textContent = `
			/* Later */
			/* ::-webkit-scrollbar {

			}

			::-webkit-scrollbar-track {

			} */

			#app > main, #app > div.fixed.inset-0 {
				max-height: calc(100vh - 32px);
				top: 32px;
			}

			#app > main > div.h-dvh > div {
				max-height: calc(100vh - 32px);
			}
				
			html {
				max-height: calc(100vh - 32px);
				padding-top: 32px;
			}
		`

		body.prepend(style)

		// Change the title bar overlay color when the theme is changed in the UI
		new MutationObserver((mutationsList, observer) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'attributes' && mutation.attributeName == 'data-theme') {
					ipcRenderer.send('update-theme', mutation.target.getAttribute(mutation.attributeName))
				}
			}
		}).observe(document.documentElement, { attributes: true });
	}
})

// New topic
ipcRenderer.on('new-topic', () => {
	try {
		const newTopicBtn1 =
			document.querySelector("#app > main > div.pointer-events-none.absolute.bottom-0.flex.w-full.z-10"
				+ " > div.relative.mb-4.flex.w-full.flex-col.items-center.px-3.sm\\:mb-8 > div"
				+ " > div.relative.overflow-hidden.backdrop-blur-2xl.backdrop-saturate-200.before\\:bg-slate-200"
				+ ".before\\:opacity-40.dark\\:before\\:bg-midnight-800.dark\\:before\\:opacity-60.before\\:absolute"
				+ ".before\\:inset-0.before\\:bg-blend-luminosity.after\\:bg-spot-peach-100.after\\:opacity-60.dark"
				+ "\\:after\\:bg-slate-800.dark\\:after\\:opacity-50.after\\:absolute.after\\:inset-0 > div > div"
				+ " > div:nth-child(2) > button")
		if (newTopicBtn1) {
			newTopicBtn1.click()
			setTimeout(() => {
				const newTopicBtn =
					document.querySelector("#app > main > div.pointer-events-none.absolute.bottom-0.flex.w-full.z-10"
						+ " > div.relative.mb-4.flex.w-full.flex-col.items-center.px-3.sm\\:mb-8 > div:nth-child(1)"
						+ " > div > button.relative.flex.items-center.justify-center.text-foreground-800.fill-foreground-800"
						+ ".active\\:text-foreground-600.active\\:fill-foreground-600.dark\\:active\\:text-foreground-650.dark"
						+ "\\:active\\:fill-foreground-650.bg-transparent.hover\\:bg-black\\/5.active\\:bg-black\\/3.dark\\:hover"
						+ "\\:bg-white\\/8.dark\\:active\\:bg-white\\/5.text-sm.min-h-10.min-w-10.px-3.py-2.gap-x-2.rounded-xl.before"
						+ "\\:rounded-xl.before\\:absolute.before\\:inset-0.before\\:pointer-events-none.before\\:border.before"
						+ "\\:border-transparent.before\\:contrast-more\\:border-2.outline-2.outline-offset-1.focus-visible"
						+ "\\:z-\\[1\\].focus-visible\\:outline.focus-visible\\:outline-stroke-900.z-10.flex.items-center"
						+ ".justify-between.text-start.ps-3\\.5")
				if (newTopicBtn) {
					newTopicBtn.click()
				}
			}, 5) // Little delay, otherwise it seem that the menu doesn't have the time to open, even if it opens after a 5ms delay
		}
	} catch (err) {
		console.log(err)
	}
})

// Focus on textarea
ipcRenderer.on('focus-on-textarea', () => {
	try {
		const textarea = document.querySelector("#userInput")
		if (textarea) {
			textarea.focus()
		}
	} catch (err) {
		console.log(err)
	}
})

// Set font size
ipcRenderer.on('set-font-size', (event, size) => {
	try {
		document.documentElement.style.fontSize = `${size}rem`
	} catch (err) {
		console.log(err)
	}
})

// Switch theme
ipcRenderer.on('switch-theme', (event, theme) => {
	try {
		document.documentElement.dataset.theme = theme
	} catch (err) {
		console.log(err)
	}
})

// Convert from conversation
// Known bugs:
// - Text shifted down (html2canvas/issues#2775)
ipcRenderer.on('export', (event, format, isDarkMode) => {
	try {
		const chatMain = document.querySelector("#app > main > div.h-dvh > div > div")

		if (chatMain.dataset.content !== 'conversation') {
			throw 'Please open a conversation before trying to export it.'
		}

		html2canvas(chatMain, {
			backgroundColor: isDarkMode ? '#0c101c' : '#282523',
			logging: false,
			useCORS: true,
			allowTaint: true,
			ignoreElements: (element) => {
				if (format === 'md' && (element.dataset.copy === 'false' && element.tagName !== 'H2')) {
					return true
				}
			},
			onclone: (doc) => {
				// Markdown
				if (format === 'md') {
					markdownHandler(doc.querySelector("#app > main > div.h-dvh > div > div"))
				}
			},
		}).then((canvas) => {
			const pngDataURL = canvas.toDataURL('image/png')
			if (format === 'png') {
				// PNG
				ipcRenderer.send('export-data', 'png', pngDataURL)
			} else if (format === 'pdf') {
				// PDF
				pdfHandler(canvas, pngDataURL)
			}
			// Rerender the draggable area
			const titleBar = document.getElementById('titleBar')
			if (titleBar) {
				titleBar.style.top === '1px'
					? (titleBar.style.top = '0px')
					: (titleBar.style.top = '1px')
			}
		})
	} catch (err) {
		console.log(err)
		ipcRenderer.send('error', 'Unable to export conversation:\n' + err)
	}
})

const pdfHandler = (canvas, pngDataURL) => {
	const pdfWidth = canvas.width / window.devicePixelRatio
	const pdfHeight = canvas.height / window.devicePixelRatio
	const pdf = new jsPDF(pdfWidth > pdfHeight ? 'landscape' : 'portrait', 'pt', [
		pdfWidth,
		pdfHeight,
	])
	pdf.addImage(pngDataURL, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST')
	const pdfDataURL = pdf.output('dataurlstring')
	ipcRenderer.send('export-data', 'pdf', pdfDataURL)
}

const markdownHandler = (element) => {
	const turndownService = new TurndownService()
	turndownService.addRule('code', { // Handle language name in code blocks
		filter: (node) => {
			return node.matches('div.rounded-xl.dark\\:border.dark\\:border-stroke-250')
		},
		replacement: (content, node) => {
			const language =
				node.querySelector("div.flex.w-full.items-center.justify-between.rounded-t-xl.border-b.border-white"
				+ "\\/20.bg-background-static-850.py-2.pe-2\\.5.ps-4.text-foreground-static-250.text-sm.dark\\"
				+ ":border-stroke-250.dark\\:bg-background-static-900 > span").textContent.trim()
			const code = node.querySelector('code').textContent.trim()
			return `\`\`\`${language}\n${code}\n\`\`\``
		},
	})
	turndownService.addRule('numberLink', {
		filter: 'sup',
		replacement: (content) => {
			return `<sup>[${content}]</sup>`
		},
	})
	turndownService.addRule('textLink', {
		filter: (node) => {
			return node.classList.contains('tooltip-target')
		},
		replacement: (content) => {
			return content
		},
	})
	turndownService.addRule('learnMore', {
		filter: (node) => {
			return node.classList.contains('learn-more')
		},
		replacement: (content, node) => {
			return node.parentNode.querySelector('a[class="attribution-item"]')
				? content
				: ''
		},
	})
	turndownService.addRule('footerLink', {
		filter: (node) => {
			return node.classList.contains('attribution-item')
		},
		replacement: (content, node) => {
			return `[${content.replace(/^(\d+)(\\.)/, '[$1]')}](${node.getAttribute(
				'href'
			)} "${node.getAttribute('title').replace(/\"/g, '')}")`
		},
	})
	turndownService.addRule('userMessage', {
		filter: (node) => {
			return node.hasAttribute('data-content') && node.dataset.content === 'user-message'
		},
		replacement: (content, node) => {
			// Get the original content, instead of the one with the trimmed line breaks
			originalNode = document.getElementById(node.parentElement.id).querySelector('div.flex.w-full.flex-col.items-end')

			return originalNode.firstElementChild.innerHTML
		},
	})
	turndownService.addRule('latex', {
		filter: (node) => {
			return node.classList.contains('katex-block')
		},
		replacement: (content, node) => {
			return `$$${node.querySelector('annotation').innerHTML.trim()}$$\n`
		},
	})
	turndownService.addRule('inlineLatex', {
		filter: (node) => {
			return node.classList.contains('katex')
		},
		replacement: (content, node) => {
			return `$${node.querySelector('annotation').innerHTML.trim()}$`
		},
	})
	const mdDataURL = Buffer.from(
		turndownService.turndown(element),
		'utf-8'
	).toString('base64')
	ipcRenderer.send('export-data', 'md', mdDataURL)
}
