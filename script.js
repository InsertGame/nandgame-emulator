let memory = new Uint16Array(65536)
let registers = new Uint16Array(3)
// PC, A, D

let memview = document.getElementById("mem")
let regview = document.getElementById("regs")

let textarea = document.getElementById("textarea")
let qparts = window.location.href.split("#")[0].split("?")
qparts.shift()
let uuid = window.location.href.split("#")[1]
let filename = decodeURI(qparts.join("?"))
let gobutton = document.getElementById("gobutton")
let stepbutton = document.getElementById("stepbutton")
let clearbtn = document.getElementById("clearbtn")

if (uuid) {
	filename = null
	textarea.disabled = true
	textarea.value = ""
	document.getElementById("filename").innerText = "Loading..."
	fetch("https://filedatabase.thedt365.repl.co/get/"+uuid)
	.then(e=>e.text())
	.then(e=>{
		let file = JSON.parse(e)
		textarea.disabled = false
		textarea.value = file.text
		document.getElementById("filename").innerText = file.name
	})
}

if (!filename) document.getElementById("save").disabled = true
if (!filename) document.getElementById("upload").disabled = true
if (filename) document.getElementById("filename").innerText = filename

function save(name) {
	if (name) {
		document.getElementById("filename").innerText = name
		document.getElementById("save").disabled = false
		document.getElementById("upload").disabled = false
		localStorage.setItem(name, textarea.value)
		filename = name
	}
}
function load(name) {
	window.location = "/?"+encodeURI(name)
}
function upload(name) {
	if (name) {
		save(filename)
		fetch("https://filedatabase.thedt365.repl.co/upload/"+name+"/"+encodeURI(textarea.value))
		.then(e=>{
			window.location = "/browser.html"
		})
	}
}

if (filename) {
	textarea.value = localStorage.getItem(filename)
}

let showbtn = document.getElementById("show")
let hidebtn = document.getElementById("hide")
let sidepanel = document.getElementById("sidepanel")

showbtn.onclick = ()=>{
	showbtn.hidden = true
	sidepanel.hidden = false
}
hidebtn.onclick = ()=>{
	showbtn.hidden = false
	sidepanel.hidden = true
}

let cpuSpeedsTxt = ["60 Hz", "600 Hz", "6 KHz", "30 KHz", "60 KHz", "300 KHz", "600 KHz", "2.4 MHz", "9.6 MHz"]
let cpuSpeeds = [1, 10, 100, 500, 1000, 5000, 10000, 40000, 160000, 1]
let cpuSpeed = 1
let gpuTypes = ["none", "nandgame <span class='tip' style='color:yellow'>⚠<tip>On higher Hz levels, writing to the screen\nmemory takes longer.", "nandgame-color <span class='tip' style='color:yellow'>⚠<tip>Extremely Experimental!\nOn higher Hz levels, writing to the screen\nmemory takes longer."]
let gpuType = 0
let chmem = {}

let display = document.getElementById("display")
let ctx = display.getContext("2d")
let displayc = document.getElementById("displayc")
let colctx = displayc.getContext("2d")

function cycleCPU() {
	cpuSpeed = cpuSpeeds[cpuSpeeds.indexOf(cpuSpeed)+1]
	document.getElementById("cpuspeed").innerHTML = cpuSpeedsTxt[cpuSpeeds.indexOf(cpuSpeed)]+(cpuSpeed>100?" <span class='tip' style='color:"+{500:"yellow",1000:"yellow",5000:"orange",10000:"orange",40000:"red",160000:"red"}[cpuSpeed]+"'>⚠<tip>"+(cpuSpeed >= 40000 ? "but why tho" : "Hz this high may cause lag. Use with caution!")+"</tip></span>":"")
}

function cycleGPU() {
	gpuType++
	if (gpuType >= gpuTypes.length) gpuType = 0
	document.getElementById("gputype").innerHTML = gpuTypes[gpuType]
	if (gpuType == 1) {
		display.style.opacity = 1
	} else {
		display.style.opacity = 0
	}
	if (gpuType == 2) {
		displayc.style.opacity = 1
	} else {
		displayc.style.opacity = 0
	}
	if (gpuType > 0) {
		document.getElementById("fullscreen").disabled = false
	} else {
		document.getElementById("fullscreen").disabled = true
	}
}

document.getElementById('textarea').addEventListener('keydown', function(e) {
	if (e.key == 'Tab' && stopbutton.hidden) {
		e.preventDefault()
		document.execCommand("insertText", false, "\t")
	}
});

function reset() {
	memory = new Uint16Array(65536)
	registers = new Uint16Array(3)
	updateMemview(offset)
	updateRegview()
	ctx.clearRect(0, 0, 512, 256)
	colctx.clearRect(0, 0, 512, 256)
	mc.clearRect(0, 0, 512, 256)
}

gobutton.onclick = ()=>{
	reset()
	gobutton.hidden = true
	textarea.disabled = true
	stopbutton.hidden = false
	stepbutton.disabled = false
	stepbutton.onclick = ()=>{step()}
	let err = run(textarea.value, ()=>{
		gobutton.hidden = false
		textarea.disabled = false
		stopbutton.hidden = true
	})
	if (err) alert(err)
}

stopbutton.onclick = ()=>{
	gobutton.hidden = false
	textarea.disabled = false
	stopbutton.hidden = true
	if (clockFrame) cancelAnimationFrame(clockFrame)
}

clearbtn.onclick = reset

function updateMemview(offset = 0) {
	memview.innerText = "  Memory\n"
	for (let z = 0; z < 16; z++) {
		memview.innerHTML += "<span style='color:"+(memory[z+offset*16] == 0 ? "#bbb" : "#fff")+"'>"+(offset*16+z).toString(16).padStart(4, "0")+": "+memory[z+offset*16].toString(16).padStart(4, "0")+"</span>\n"
	}
}

function updateRegview() {
	regview.innerText = "         Registers         \n"
	regview.innerText += "A: "+registers[1].toString(16).padStart(4, "0")+"  "
	regview.innerText += "D: "+registers[2].toString(16).padStart(4, "0")+"  "
	regview.innerText += "PC: "+registers[0].toString(16).padStart(4, "0")
}

let offset = 0
updateMemview()
updateRegview()

mem.addEventListener('wheel', (event) => {
	event.preventDefault()
	if (event.deltaY > 0) {
		if (offset < 4095) offset++
		updateMemview(offset)
	} else {
		if (offset > 0) offset--
		updateMemview(offset)
	}
});

function run(str, cb) {
	let lines = str.split("\n")
	let fullcode = []
	let code = fullcode
	let constants = {}
	let macros = {}
	let definedmacros = {}
	let taken = {
		DEFINE: true,
		LABEL: true,
		NOP: true,
		MACRO: true,
	}
	let inmacro = false
	let lineno = 0
	let fulllineno = 0
	function err(msg, offs) {
		cb()
		return `Error on line ${lineno-1+offs}:\n${msg}\n`+tline
	}
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i]
		tline = line.trimStart().trimEnd()
		if (tline.startsWith("MACRO")) {
			if (inmacro) {
				let args = tline.replace(/\s+$/g,"").split(/\s+/g)
				args.shift()
				if (args.length == 0) {
					macros[inmacro].lines = lineno
					lineno = fulllineno
					inmacro = false
				}
			} else {
				let args = tline.replace(/\s+$/g,"").split(/\s+/g)
				args.shift()
				let mname = args.shift()
				if (mname.match(/^0x[0-9a-fA-F]{1,4}$/) || mname.match(/^\d+$/) || mname.match(/^0b[01_]{1,16}$/))
					return err("Invalid macro name")
				if (taken[mname])
					return err("Macro name in use")
				inmacro = mname
				fulllineno = lineno
				lineno = 0
				macros[mname] = {
					text: "",
					args: args,
				}
			}
		}
		else if (!inmacro && tline.startsWith("DEFINE")) {
			let parts = tline.split(/\s+/g)
			parts.shift()
			let con = parts.shift()
			if (con.match(/^0b[01_]{1,16}$/) || con.match(/^0x[0-9a-fA-F]{1,4}$/) || con.match(/^\d+$/))
				return err("Invalid constant name")
			if (taken[con])
				return err("Constant name in use")
			let val = parts.shift()
			if (constants[val])
				val = constants[val]
			if (!(val.match(/^0b[01_]{1,16}$/) || val.match(/^0x[0-9a-fA-F]{1,4}$/) || val.match(/^\d+$/)))
				return err("Invalid constant value")
			constants[con] = val
			taken[con] = true
		} else if (!inmacro && tline.startsWith("LABEL")) {
			let parts = tline.split(/\s+/g)
			parts.shift()
			let con = parts.shift()
			if (con.match(/^0x[0-9a-fA-F]{1,4}$/) || con.match(/^\d+$/) || con.match(/^0b[01_]{1,16}$/))
				return err("Invalid constant name")
			if (taken[con])
				return err("Constant name in use")
			let val = (lineno).toString()
			constants[con] = val
			taken[con] = true
		} else if (macros[tline.split(" ")[0]]) {
			let args = tline.split(/\s+/g)
			let mac = macros[args[0]]
			lines.splice(i, 1)
			args.shift() 
			let mactext = mac.text
			for (let i = 0; i < mac.args.length; i++) {
				let arg = mac.args[i]
				mactext = mactext.replaceAll(`{${arg}}`, args[i])
			}
			lines.splice(i, 0, ...mactext.split("\n"))
			i--
		} else if (tline[0] != "#" && line.replace(/\s/gm, "").length > 0) {
			if (inmacro) {
				macros[inmacro].text += tline+"\n"
			}
			lineno ++
		}
	}
	lineno = 0
	inmacro = false
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i]
		tline = line.trimStart().trimEnd()
		if (!inmacro && tline.startsWith("DEFINE"));
		else if (!inmacro && tline.startsWith("LABEL"));
		else if (tline.startsWith("MACRO")) {
			inmacro = !inmacro
			if (inmacro) {
				let parts = tline.replace(/\s+$/g,"").split(/\s+/g)
				definedmacros[parts[1]] = true
			}
		}
		else if (!inmacro && tline == "NOP") {
			code.push([[e=>0],e=>0,c=>false])
			lineno++
		} else if (macros[tline.split(" ")[0]]) {

		} else
		if (tline[0] != "#" && !inmacro) {
			let expr = line.replace(/\s/gm, "")
			if (expr.length == 0)
				continue
			lineno++
			if (expr == "JMP") {
				code.push([[e=>0],e=>0,c=>true])
				continue
			}
			let dest = ""
			let calc = expr
			let jmp = null
			if (expr.match(/=/g)) {
				if (expr.match(/=/g).length > 1)
					return err("Invalid Syntax")
				dest = calc.split("=")[0]
				calc = calc.split("=")[1]
			}
			if (expr.match(/;/g)) {
				if (expr.match(/;/g).length > 1)
					return err("Invalid Syntax")
				jmp = calc.split(";")[1]
				calc = calc.split(";")[0]
			}
			if (dest == "A" && constants[calc]) {
				calc = constants[calc]
				if (calc > 0x7fff || calc < 0)
					return err("A cannot be set larger than 32767 or less than 0")
			}
			if (dest == "A" && calc.match(/^0x[0-9a-fA-F]{1,4}$/)) {
				calc = parseInt(calc.replace("0x",""), 16)
				if (calc > 0x7fff || calc < 0)
					return err("A cannot be set larger than 0x7fff")
			} else if (dest == "A" && calc.match(/^0b[01_]{1,16}$/)) {
				calc = parseInt(calc.replace("0b","").replaceAll("_",""), 2)
				if (calc > 0x7fff || calc < 0)
					return err("A cannot have a binary value where the furthest left bit is set (A cannot be set larger than 0b0111111111111111)")
			} else if (dest == "A" && calc.match(/^\d+$/)) {
				calc = parseInt(calc)
				if (calc > 0x7fff || calc < 0)
					return err("A cannot be set larger than 32767 or less than 0")
			}
			dest = dest.split(",")
			if (dest.length > 3)
				return err("Too many destinations")
			let dests = {
				A:v=>registers[1]=v,
				D:v=>registers[2]=v,
				"*A":v=>chmem[registers[1]]=(memory[registers[1]]=v),
				"":v=>v,
			}
			for (let i = 0; i < dest.length; i++) {
				if (dests[dest[i]]) {
					let d = dest[i]
					dest[i] = dests[d]
					dests[d] = false
				} else
					return err("Invalid Destination")
			}
			let calcs = {
				"D+A": e=>registers[1]+registers[2],
				"A+D": e=>registers[1]+registers[2],
				"D-A": e=>registers[2]-registers[1],
				"A-D": e=>registers[1]-registers[2],
				"D+1": e=>registers[2]+1,
				"D-1": e=>registers[2]-1,
				"A+1": e=>registers[1]+1,
				"A-1": e=>registers[1]-1,
				"-D": e=>-registers[2],
				"-A": e=>-registers[1],
				"-1": e=>-1,
				"1": e=>1,
				"D": e=>registers[2],
				"A": e=>registers[1],
				"D&A": e=>registers[2]&registers[1],
				"A&D": e=>registers[1]&registers[2],
				"D|A": e=>registers[2]|registers[1],
				"A|D": e=>registers[1]|registers[2],
				"~D": e=>~registers[2],
				"~A": e=>~registers[1],
				"0": e=>0,
				
				"D+*A": e=>memory[registers[1]]+registers[2],
				"*A+D": e=>memory[registers[1]]+registers[2],
				"D-*A": e=>registers[2]-memory[registers[1]],
				"*A-D": e=>memory[registers[1]]-registers[2],

				"*A+1": e=>memory[registers[1]]+1,
				"*A-1": e=>memory[registers[1]]-1,

				"-*A": e=>-memory[registers[1]],

				"*A": e=>memory[registers[1]],

				"D&*A": e=>registers[2]&memory[registers[1]],
				"*A&D": e=>memory[registers[1]]&registers[2],
				"D|*A": e=>registers[2]|memory[registers[1]],
				"*A|D": e=>memory[registers[1]]|registers[2],

				"~*A": e=>~memory[registers[1]],
			}
			if (typeof calc == "string" && !calcs[calc])
				return err("Calculation "+calc+" not supported")
			if (typeof calc == "string") 
				calc = calcs[calc]
			let jmps = {
				JLT: c=>c<0||c>32767,
				JGT: c=>c>0&&c<=32767,
				JEQ: c=>c==0,
				JLE: c=>c<=0||c>32767,
				JGE: c=>c>=0&&c<=32767,
				JNE: c=>c!=0,
			}
			jmps[null] = 
				c=>false
			if (!jmps[jmp])
				return err("Invalid jump condition")
			jmp = jmps[jmp]
			code.push([dest,calc,jmp])
		}
	}
	function execute([dest, calc, jump]) {
		let res
		if (typeof calc === "number")
			res = calc
		else
			res = calc()
		for (let i = 0; i < dest.length; i++) {
			dest[i](res)
		}
		let j = jump(res)
		if (j) 
			registers[0] = registers[1]
		else
			registers[0]++
	}
	registers[0] = 0
	clockTick()
	step = ()=>{
		clockTick(true)
	}

	function clockTick(stepp = false) {
		for (let i = 0; i < (stepp ? 1 : cpuSpeed) && registers[0] < code.length; i++) {
			execute(code[registers[0]])
		}
		if (gpuType == 1) doGraphics()
		if (gpuType == 2) doColorGraphics()
		updateMemview(offset)
		updateRegview()
		if (registers[0] < code.length) {
			if (!stepp) clockFrame = requestAnimationFrame(()=>{
				clockTick()
			})
		} else cb()
	}
}

function getColorIndices(x, y, width) {
	const red = y * (width * 4) + x * 4;
	return [red, red + 1, red + 2, red + 3];
}

function convert16to24(input) {
	let RGB565 = input;
	let r = (RGB565 & 0xF800) >> 11;
	let g = (RGB565 & 0x07E0) >> 5;
	let b = RGB565 & 0x1F;
	
	r = (r * 527 + 23) >> 6;
	g = (g * 259 + 33) >> 6;
	b = (b * 527 + 23) >> 6;
	
	return [r, g, b];
}

function doGraphics() {
	const d = ctx.getImageData(0, 0, 512, 256)
	for (const [addr, val] of Object.entries(chmem)) {
		if (addr >= 0x4000 && addr < 0x6000) {
			let x = (addr%32)*16
			let y = (addr-(addr%32)-0x4000)/32
			putPixel(d.data,x,y, val & 32768)
			putPixel(d.data,x+1,y, val & 16384)
			putPixel(d.data,x+2,y, val & 8192)
			putPixel(d.data,x+3,y, val & 4096)
			putPixel(d.data,x+4,y, val & 2048)
			putPixel(d.data,x+5,y, val & 1024)
			putPixel(d.data,x+6,y, val & 512)
			putPixel(d.data,x+7,y, val & 256)
			putPixel(d.data,x+8,y, val & 128)
			putPixel(d.data,x+9,y, val & 64)
			putPixel(d.data,x+10,y, val & 32)
			putPixel(d.data,x+11,y, val & 16)
			putPixel(d.data,x+12,y, val & 8)
			putPixel(d.data,x+13,y, val & 4)
			putPixel(d.data,x+14,y, val & 2)
			putPixel(d.data,x+15,y, val & 1)
		}
	}
	ctx.putImageData(d, 0, 0)
	chmem = {}
}
let minicanv = document.createElement("canvas")
minicanv.width = 128
minicanv.height = 64
let mc = minicanv.getContext("2d")
colctx.scale(4, 4)
colctx.imageSmoothingEnabled = false
function doColorGraphics() {
	const d = mc.getImageData(0, 0, 128, 64)
	for (const [addr, val] of Object.entries(chmem)) {
		if (addr >= 0x4000 && addr < 0x6000) {
			let x = addr%128
			let y = (addr-0x4000-(addr%128))/128
			putPixelC(d.data,x,y, convert16to24(val))
		}
	}
	mc.putImageData(d, 0, 0)
	colctx.drawImage(minicanv, 0, 0)
	chmem = {}
}

function putPixel(data, x, y, cond) {
	const [r, g, b, a] = getColorIndices(x, y, 512)
	data[r] = data[b] = 0
	data[g] = 221
	data[a] = cond ? 255 : 0
}

function putPixelC(data, x, y, [red,green,blue]) {
	const [r, g, b, a] = getColorIndices(x, y, 128)
	data[r] = red
	data[b] = blue
	data[g] = green
	data[a] = 255
}