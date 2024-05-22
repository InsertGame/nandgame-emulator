// stackoverflow is based
(function()
{
var div = document.createElement('div');
var cssTable = 'padding:0px 0px 0px 0px!important; margin:0px 0px 0px 0px!important; font-size:1px;line-height:0px; width:auto;';
      var cssTd1 = 'border:1px #345 solid; border-right:0px; vertical-align:top; width:1px;';
      var cssTd2 = 'border:1px #345 solid; border-left:0px; vertical-align:top;';
      var cssButton = 'width:120px; height:40px; border:1px solid #333 !important; border-bottom-color: #484!important; color:#ffe; background-color:#222;';
      var cssCanvas = 'border:0px; background-color:#1c1c20; margin-top:0px; padding-top:0px;';
      var cssTextArea =  'width:100%;'
                       + 'height:100%;'
                       + 'font-size:11px;'
                       + 'font-family:monospace;'
                       + 'line-height:12px;'
                       + 'font-weight:500;'
                       + 'margin: 0px 0px 0px 0px;'
                       + 'padding: 1px 0px 0px 0px;'
                       + 'resize: none;'
                       + 'color:#fff;'
                       + 'border:0px;'
                       + 'background-color:#222;'
                       + 'white-space:pre; overflow:auto;'                    
                       // supported only in opera 12.x
                       + 'scrollbar-arrow-color: #ee8;'
                       + 'scrollbar-base-color: #444;'
                       + 'scrollbar-track-color: #666;'
                       + 'scrollbar-face-color: #444;'
                       + 'scrollbar-3dlight-color: #444;' /* outer light */
                       + 'scrollbar-highlight-color: #666;' /* inner light */
                       + 'scrollbar-darkshadow-color: #444;' /* outer dark */
                       + 'scrollbar-shadow-color: #222;' /* inner dark */
                       ;

      // TEXTAREA
      var ta = this.evalnode = document.getElementById('textarea');
          ta.setAttribute('style', cssTextArea);
	  var p = ta.parentElement
          //ta.value = this.S.get('eval') || '';  // get previous executed value ;)

      // LAYOUT (table 2 panels)
      var table = document.createElement('table');
          table.setAttribute('cellspacing','0');
          table.setAttribute('cellpadding','0');
          table.setAttribute('style', cssTable);
		  table.style.height = "100%";
      var tr = document.createElement('tr');
      var tr2 = document.createElement('th');
	      tr2.colSpan = 2
		  tr2.style.height = "20px"
      var td1 = document.createElement('td');
          td1.setAttribute('style', cssTd1);
      var td2 = document.createElement('td');
          td2.setAttribute('style', cssTd2);
          tr.appendChild(td1);
          tr.appendChild(td2);
		  tr2.appendChild(document.getElementById("menubar"))
          table.appendChild(tr2);
          table.appendChild(tr);

      // TEXTAREA NUMBERS (Canvas)
      var canvas = document.createElement('canvas');
          canvas.width = 48;    // must not set width & height in css !!!
          canvas.height = 500;  // must not set width & height in css !!!
          canvas.setAttribute('style', cssCanvas);
          ta.canvasLines = canvas;
          td1.appendChild(canvas);
		  td1.style.height = "100%";
          td2.appendChild(ta);
		  td2.style.width = "100%";
		  td2.style.height = "100%";
          div.appendChild(table);

      // PAINT LINE NUMBERS
      ta.paintLineNumbers = function()
      {
        try
        {
        var canvas = this.canvasLines;
        canvas.height = 0;
        canvas.height = canvas.parentElement.clientHeight; // on resize
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#303030";
        ctx.fillRect(0, 0, 42, this.scrollHeight+1);
        ctx.fillStyle = "#808080";
        ctx.font = "11px monospace"; // NOTICE: must match TextArea font-size(11px) and lineheight(15) !!!
        var startIndex = Math.floor(this.scrollTop / 12,0);
        var endIndex = startIndex + Math.ceil(this.clientHeight / 12,0);
		let lineno = 0
		let talines = ta.value.split("\n")
		let linecount = talines.length
		var inmacro = false
		var macroln = 0
		var macroname
		var ignorewords = {DEFINE:0,LABEL:0,MACRO:0}
        for (var i = 0; i <= endIndex && i < linecount; i++)
        {
          ctx.fillStyle = lineno > 65535 ? "#ff8080" : "#808080";
		  var l = talines[i].trimStart().split(" ")
		  var tl = l[0]
          var ph = 10 - this.scrollTop + (i*12);
		  if (tl == "MACRO") {
			if (inmacro) {
			  ignorewords[macroname] = macroln
			  macroln = 0
			  inmacro = false
			} else {
			  macroname = l[1]
			  inmacro = true
			}
        	ctx.fillStyle = "#8080ff";
			if (i >= startIndex) ctx.fillText("-------",-2,ph)
		  } else if (tl.length > 0 && tl[0] != "#") {
			if (ignorewords[tl] === undefined) {
			  var text = (inmacro ? macroln : lineno).toString();  // line number
			  if (i >= startIndex) ctx.fillText(text,40-(text.length*6),ph);
			  inmacro ? macroln++ : lineno++
		    } else {
        	  if (ignorewords[tl]) ctx.fillStyle = "#8080ff";
			  var text = ignorewords[tl] ? (inmacro ? macroln : lineno).toString() : "-------" // line number
			  if (i >= startIndex) ctx.fillText(text,40-(text.length*6),ph);
			  inmacro ? macroln += ignorewords[tl] : lineno += ignorewords[tl]
		    };
		  }
        }
        }
        catch(e){ alert(e); }
      };
      ta.onscroll     = function(ev){ this.paintLineNumbers(); };
      ta.onmousedown  = function(ev){ this.mouseisdown = true; }
      ta.onmouseup    = function(ev){ this.mouseisdown=false; this.paintLineNumbers(); };
      ta.onmousemove  = function(ev){ if (this.mouseisdown) this.paintLineNumbers(); };
	  ta.oninput      = function(ev){ this.paintLineNumbers(); };
	  onresize        = function(ev){ this.paintLineNumbers(); };
      

	p.appendChild(div);
    // make sure it's painted
	ta.paintLineNumbers();
    return ta;
})()