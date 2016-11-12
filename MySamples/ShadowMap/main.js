var gl;
var shaderInfos = {};	// store informations of each shader (shader program, uniforms, attributes...)
var verticesBuffer;	// vertex buffer of cube
var indicesBuffer;	// index buffer of cube
var shadowMapFramebuffer;
var shadowMapTexture;
var mouseDrag;		// used to process mouse drag event
var startTime, lastUpdateTime;

var CANVAS_WIDTH, CANVAS_HEIGHT;
var SHADOW_MAP_SIZE;

function initWebGL()
{
    var canvas = document.getElementById("glcanvas");
    try
    {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch (e)
    {
    }
    if(!gl)
    {
        alert("Your browser doesn't appear to support WebGL.");
        gl = null;
    }
}

function initConsts()
{
	var canvas = document.getElementById("glcanvas");
	CANVAS_WIDTH = canvas.width;
	CANVAS_HEIGHT = canvas.height;
	SHADOW_MAP_SIZE = 1024;
}

function getShader(id)
{
    shaderScript = document.getElementById(id);
    if(!shaderScript)
        return null;
    shaderSource = "";
    currentChild = shaderScript.firstChild;
    while(currentChild)
    {
        if(currentChild.nodeType == currentChild.TEXT_NODE)
            shaderSource += currentChild.textContent;
        currentChild = currentChild.nextSibling;
    }

    var shader = null;
    if(shaderScript.type == "x-shader/x-vertex")
        shader = gl.createShader(gl.VERTEX_SHADER);
    else if(shaderScript.type == "x-shader/x-fragment")
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    else
        return null;

    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function initShaders()
{
	var shadowMapVertexShader = getShader("shadowmap-shader-vs");
    var colorVertexShader = getShader("color-shader-vs");
	var shadowMapFragmentShader = getShader("shadowmap-shader-fs");
	var colorFragmentShader = getShader("color-shader-fs");

	var program;

	shaderInfos.color = {}
	shaderInfos.color.program = program = gl.createProgram();
    gl.attachShader(program, colorVertexShader);
    gl.attachShader(program, colorFragmentShader);
    gl.linkProgram(program);

	shaderInfos.shadowMap = {}
	shaderInfos.shadowMap.program = program = gl.createProgram();
    gl.attachShader(program, shadowMapVertexShader);
    gl.attachShader(program, shadowMapFragmentShader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(shaderInfos.shadowMap.program, gl.LINK_STATUS)
			|| !gl.getProgramParameter(shaderInfos.color.program, gl.LINK_STATUS))
        alert("Unable to initialize the shader program.");

	var attributes;
	program = shaderInfos.color.program;
	shaderInfos.color.attributes = attributes = {};
    attributes.pos = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(attributes.pos);
	attributes.normal = gl.getAttribLocation(program, "normal");
    gl.enableVertexAttribArray(attributes.normal);

	program = shaderInfos.shadowMap.program;
	shaderInfos.shadowMap.attributes = attributes = {};
    attributes.pos = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(attributes.pos);

	var uniforms;
	program = shaderInfos.color.program;
	shaderInfos.color.uniforms = uniforms = {};
    uniforms.modelMatrix = gl.getUniformLocation(program, "modelMatrix");
	uniforms.invTransModelMatrix = gl.getUniformLocation(program, "invTransModelMatrix");
    uniforms.viewMatrix = gl.getUniformLocation(program, "viewMatrix");
    uniforms.projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
    uniforms.meshColor = gl.getUniformLocation(program, "meshColor");
	uniforms.lightDirection = gl.getUniformLocation(program, "lightDirection");
	uniforms.sampler = gl.getUniformLocation(program, "sampler");
	uniforms.shadowmapViewProjectionMatrix = gl.getUniformLocation(program, "shadowmapViewProjectionMatrix");

	shaderInfos.shadowMap.uniforms = uniforms = {};
	program = shaderInfos.shadowMap.program;
    uniforms.modelMatrix = gl.getUniformLocation(program, "modelMatrix");
    uniforms.viewMatrix = gl.getUniformLocation(program, "viewMatrix");
    uniforms.projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
}

function initResources()
{
    verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ModelCube.vertices), gl.STATIC_DRAW);

    indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ModelCube.indices), gl.STATIC_DRAW);

	var renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
	shadowMapFramebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMapFramebuffer);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
	shadowMapTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowMapTexture, 0);
}

function initProgram()
{
    gl.clearColor(0.0, 0.3, 0.5, 1.000000000);
    gl.clearDepth(1.0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    startTime = lastUpdateTime = (new Date).getTime();
	mouseDrag = new MouseDrag(document.getElementById("glcanvas"), 6);
}

function updateFps(deltaTime)
{
    var labelFps = document.getElementById("labelFps");
    labelFps.innerHTML = "FPS: " + (1000 / deltaTime).toFixed(1);
}

function drawCube(shaderInfo, viewMatrix, projectionMatrix, shadowmapViewProjectionMatrix, meshColor, translation, scale, lightDirection)
{
	var scaleMatrix = mat4.create();
	mat4.fromScaling(scaleMatrix, scale);
	var translateMatrix = mat4.create();
	mat4.fromTranslation(translateMatrix, translation);
	var modelMatrix = translateMatrix;
	mat4.mul(modelMatrix, modelMatrix, scaleMatrix);

	var invTransModelMatrix = mat4.create();
	mat4.invert(invTransModelMatrix, modelMatrix);
	mat4.transpose(invTransModelMatrix, invTransModelMatrix);

	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.vertexAttribPointer(shaderInfo.attributes.pos, 3, gl.FLOAT, false, 24, 0);
	if(shaderInfo.attributes.normal !== undefined)
		gl.vertexAttribPointer(shaderInfo.attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

	uniforms = shaderInfo.uniforms;
    gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix);
	if(uniforms.invTransModelMatrix !== undefined)
		gl.uniformMatrix4fv(uniforms.invTransModelMatrix, false, invTransModelMatrix);
    gl.uniformMatrix4fv(uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.projectionMatrix, false, projectionMatrix);
	if(uniforms.meshColor !== undefined)
    	gl.uniform3fv(uniforms.meshColor, meshColor);
	if(uniforms.lightDirection !== undefined)
		gl.uniform3fv(uniforms.lightDirection, lightDirection);
	if(uniforms.sampler !== undefined)
	{
		gl.bindTexture(gl.TEXTURE_2D, shadowMapTexture);
		gl.uniform1i(uniforms.sampler, 0);
	}
	if(uniforms.shadowmapViewProjectionMatrix !== undefined)
		gl.uniformMatrix4fv(uniforms.shadowmapViewProjectionMatrix, false, shadowmapViewProjectionMatrix);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function drawScene(shaderInfo, viewMatrix, projectionMatrix, shadowmapViewProjectionMatrix, lightDirection)
{
	gl.useProgram(shaderInfo.program);

	drawCube(shaderInfo, viewMatrix, projectionMatrix, shadowmapViewProjectionMatrix, [1, 0, 0], [0, 0, 0], [1, 1, 1], lightDirection);
	drawCube(shaderInfo, viewMatrix, projectionMatrix, shadowmapViewProjectionMatrix, [0, 1, 0], [0, 1.25, 0], [0.25, 0.25, 0.25], lightDirection);
}

function render()
{
    var currentTime = (new Date).getTime();
    var deltaTime = currentTime - lastUpdateTime;
    if(deltaTime == 0)
        deltaTime = 1;
    lastUpdateTime = currentTime;

    updateFps(deltaTime);

    var t = (currentTime - startTime) / 1000;

	var lightDirection = [-1, 3, -2];

	var viewMatrix = mat4.create();
	mat4.lookAt(viewMatrix, lightDirection, [0, 0, 0], [0, 1, 0]);

    var projectionMatrix = mat4.create();
    mat4.ortho(projectionMatrix, -3, 3, -3, 3, 0, 5);

	var shadowmapViewProjectionMatrix = mat4.create();
	mat4.mul(shadowmapViewProjectionMatrix, projectionMatrix, viewMatrix);

	gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMapFramebuffer);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.viewport(0, 0, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
	drawScene(shaderInfos.shadowMap, viewMatrix, projectionMatrix, shadowmapViewProjectionMatrix, lightDirection);

	viewMatrix = mouseDrag.getViewMatrix();
	projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.01, 200);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawScene(shaderInfos.color, viewMatrix, projectionMatrix, shadowmapViewProjectionMatrix, lightDirection);
}

function start()
{
    initWebGL();
	initConsts();
    if(gl)
    {
        initShaders();
        initResources();
        initProgram();
        setInterval(render, 1000 / 60);
    }
}
