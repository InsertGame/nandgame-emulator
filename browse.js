let title = document.getElementById("title")
let content = document.getElementById("filebrowser")

if (window.location.hash == "#local") {
	title.innerText = "My Files"
	for (let i = 0; i < localStorage.length; i++) {
		let key = localStorage.key(i)
		content.append("\n")
		let a = document.createElement("f")
		a.onclick = e=>document.location = "/?"+encodeURI(key)
		let preview = localStorage[key].split("\n")
		preview.length = 4
		a.append(document.createElement("row"))
		let delbtn = document.createElement("button")
		delbtn.onclick = (e)=>{
			e.stopPropagation()
			if (confirm("Are you sure you want to delete this file?")) {
				localStorage.removeItem(key)
				window.location.reload()
			}
		}
		delbtn.innerText = "Delete"
		a.lastChild.append(delbtn)
		let text = document.createElement("span")
		text.innerText = key
		text.style.textAlign = "center"
		text.style.width = "100%"
		text.style.lineHeight = "20px"
		a.lastChild.append(text)
		a.append(document.createElement("pre"))
		a.lastChild.append(preview.join("\n"))
		a.lastChild.className = "previewpane"
		content.appendChild(a)
	}
} else {
	if (true) {
		title.innerText = "Online creates no longer work, sorry!"
	} else {
		fetch("https://filedatabase.thedt365.repl.co/")
		.then(e=>e.text())
		.then(e=>{
			let data = JSON.parse(e)
			title.innerText = "Browse"
			for (let i = 0; i < data.length; i++) {
				let key = data[i].name
				content.append("\n")
				let a = document.createElement("f")
				a.onclick = e=>{
					window.location = "/#"+data[i].id
				}
				a.append(document.createElement("row"))
				/*
				let delbtn = document.createElement("button")
				delbtn.onclick = (e)=>{
					e.stopPropagation()
					if (confirm("Are you sure you want to delete this file?")) {
						localStorage.removeItem(key)
						window.location.reload()
					}
				}
				delbtn.innerText = "Delete"
				a.lastChild.append(delbtn)
				*/
				let text = document.createElement("span")
				text.innerText = key
				text.style.textAlign = "center"
				text.style.width = "100%"
				text.style.lineHeight = "20px"
				a.lastChild.append(text)
				a.append(document.createElement("pre"))
				a.lastChild.append(data[i].preview)
				a.lastChild.className = "previewpane"
				content.appendChild(a)
			}
		})
	}
}