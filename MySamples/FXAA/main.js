var gl;
var shaderInfos = {};	// store informations of each shader (shader program, uniforms, attributes...)
var verticesBuffer;	// vertex buffer of cube
var indicesBuffer;	// index buffer of cube
var mouseDrag;		// used to process mouse drag event
var startTime, lastUpdateTime;

var CANVAS_WIDTH, CANVAS_HEIGHT;

function initWebGL()
{
    var canvas = document.getElementById("glcanvas");
    try
    {
        gl = canvas.getContext("webgl", {antialias: false}) || canvas.getContext("experimental-webgl", {antialias: false});
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
    var colorVertexShader = getShader("color-shader-vs");
	var colorFragmentShader = getShader("color-shader-fs");

	var program;

	shaderInfos.color = {}
	shaderInfos.color.program = program = gl.createProgram();
    gl.attachShader(program, colorVertexShader);
    gl.attachShader(program, colorFragmentShader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(shaderInfos.color.program, gl.LINK_STATUS))
        alert("Unable to initialize the shader program.");

	var attributes;
	program = shaderInfos.color.program;
	shaderInfos.color.attributes = attributes = {};
    attributes.pos = gl.getAttribLocation(program, "pos");
    gl.enableVertexAttribArray(attributes.pos);
	attributes.normal = gl.getAttribLocation(program, "normal");
    gl.enableVertexAttribArray(attributes.normal);

	var uniforms;
	program = shaderInfos.color.program;
	shaderInfos.color.uniforms = uniforms = {};
    uniforms.modelMatrix = gl.getUniformLocation(program, "modelMatrix");
	uniforms.invTransModelMatrix = gl.getUniformLocation(program, "invTransModelMatrix");
    uniforms.viewMatrix = gl.getUniformLocation(program, "viewMatrix");
    uniforms.projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
    uniforms.meshColor = gl.getUniformLocation(program, "meshColor");
	uniforms.lightDirection = gl.getUniformLocation(program, "lightDirection");
}

function initResources()
{
    verticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ModelCube.vertices), gl.STATIC_DRAW);

    indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ModelCube.indices), gl.STATIC_DRAW);
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

function drawCube(shaderInfo, viewMatrix, projectionMatrix, meshColor, translation, scale, lightDirection)
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
	gl.vertexAttribPointer(shaderInfo.attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

	uniforms = shaderInfo.uniforms;
    gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix);
	gl.uniformMatrix4fv(uniforms.invTransModelMatrix, false, invTransModelMatrix);
    gl.uniformMatrix4fv(uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniform3fv(uniforms.meshColor, meshColor);
	gl.uniform3fv(uniforms.lightDirection, lightDirection);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}

function drawScene(shaderInfo, viewMatrix, projectionMatrix, lightDirection, t)
{
	gl.useProgram(shaderInfo.program);

	drawCube(shaderInfo, viewMatrix, projectionMatrix, [1, 0, 0], [0, 0, 0], [1, 1, 1], lightDirection);
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

	var viewMatrix = mouseDrag.getViewMatrix();
	var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.01, 200);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	drawScene(shaderInfos.color, viewMatrix, projectionMatrix, lightDirection, t);
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
