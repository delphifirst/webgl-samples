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
    var vertexShader = getShader("shader-vs");
	var colorFragmentShader = getShader("color-shader-fs");

	shaderInfos.color = {}
	shaderInfos.color.program = gl.createProgram();
    gl.attachShader(shaderInfos.color.program, vertexShader);
    gl.attachShader(shaderInfos.color.program, colorFragmentShader);
    gl.linkProgram(shaderInfos.color.program);

    if(!gl.getProgramParameter(shaderInfos.color.program, gl.LINK_STATUS))
        alert("Unable to initialize the shader program.");

	shaderInfos.color.attributes = {};
    shaderInfos.color.attributes.pos = gl.getAttribLocation(shaderInfos.color.program, "pos");
    gl.enableVertexAttribArray(shaderInfos.color.attributes.pos);
	shaderInfos.color.attributes.normal = gl.getAttribLocation(shaderInfos.color.program, "normal");
    gl.enableVertexAttribArray(shaderInfos.color.attributes.normal);

	shaderInfos.color.uniforms = {};
    shaderInfos.color.uniforms.modelMatrix = gl.getUniformLocation(shaderInfos.color.program, "modelMatrix");
	shaderInfos.color.uniforms.invTransModelMatrix = gl.getUniformLocation(shaderInfos.color.program, "invTransModelMatrix");
    shaderInfos.color.uniforms.viewMatrix = gl.getUniformLocation(shaderInfos.color.program, "viewMatrix");
    shaderInfos.color.uniforms.projectionMatrix = gl.getUniformLocation(shaderInfos.color.program, "projectionMatrix");
    shaderInfos.color.uniforms.meshColor = gl.getUniformLocation(shaderInfos.color.program, "meshColor");
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
    gl.clearColor(0.0, 0.0, 0.0, 1.000000000);
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

function drawCube(viewMatrix, projectionMatrix, meshColor, translation, scale)
{
	gl.useProgram(shaderInfos.color.program);

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
    gl.vertexAttribPointer(shaderInfos.color.attributes.pos, 3, gl.FLOAT, false, 24, 0);
	gl.vertexAttribPointer(shaderInfos.color.attributes.normal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);

    gl.uniformMatrix4fv(shaderInfos.color.uniforms.modelMatrix, false, modelMatrix);
	gl.uniformMatrix4fv(shaderInfos.color.uniforms.invTransModelMatrix, false, invTransModelMatrix);
    gl.uniformMatrix4fv(shaderInfos.color.uniforms.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(shaderInfos.color.uniforms.projectionMatrix, false, projectionMatrix);
    gl.uniform3fv(shaderInfos.color.uniforms.meshColor, meshColor);

    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
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

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var viewMatrix = mouseDrag.getViewMatrix();

    var projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.01, 200);

    drawCube(viewMatrix, projectionMatrix, [1, 0, 0], [0, 0, 0], [1, 1, 1]);
	drawCube(viewMatrix, projectionMatrix, [0, 1, 0], [0, 1.25, 0], [0.25, 0.25, 0.25]);
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
