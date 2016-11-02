function MouseDrag(canvas, distance)
{
	this.preX = 0;
	this.preY = 0;
	this.alpha = -Math.PI / 2;
	this.beta = 0;

	this.baseAlpha = 0;
	this.baseBeta = 0;
	this.mousemoveCallback = function(){};
	this.mouseupCallback = function(){};

	this.distance = distance;
	this.canvas = canvas;

	var thisObject = this;
	canvas.addEventListener("mousedown", function(evt){thisObject.onMouseDown(evt)});
}

MouseDrag.prototype.betaLimit =  Math.PI / 180 * 85;

MouseDrag.prototype.getViewMatrix = function()
{
	var viewMatrix = mat4.create();
	var eyePos = this.getEyePos();
	mat4.lookAt(viewMatrix, eyePos, [0, 0, 0], [0, 1, 0]);
	return viewMatrix;
};


MouseDrag.prototype.getEyePos = function()
{
	var result = vec3.create();
	var horizontalDistance = Math.cos(this.beta) * this.distance;
	var eyePosX = Math.cos(this.alpha) * horizontalDistance;
	var eyePosY = Math.sin(this.beta) * this.distance;
	var eyePosZ = - Math.sin(this.alpha) * horizontalDistance;
	vec3.set(result, eyePosX, eyePosY, eyePosZ);
	return result;
}

MouseDrag.prototype.onMouseDown = function(event)
{
	var thisObject = this;
	this.mousemoveCallback = function(evt){thisObject.onMouseMove(evt)};
	this.mouseupCallback = function(evt){thisObject.onMouseUp(evt)};
	document.addEventListener("mousemove", this.mousemoveCallback);
	document.addEventListener("mouseup", this.mouseupCallback);
	this.preX = event.clientX;
	this.preY = event.clientY;
	this.baseAlpha = this.alpha;
	this.baseBeta = this.beta;
}

MouseDrag.prototype.onMouseMove = function(event)
{
	var r = this.canvas.getBoundingClientRect();
	var deltaAlpha = -(event.clientX - this.preX) * Math.PI / 300;
	var deltaBeta = (event.clientY - this.preY) * Math.PI / 300;
	this.alpha = this.baseAlpha + deltaAlpha;
	this.beta = this.baseBeta + deltaBeta;
	if(this.beta < -this.betaLimit)
		this.beta = -this.betaLimit;
	if(this.beta > this.betaLimit)
		this.beta = this.betaLimit;
}

MouseDrag.prototype.onMouseUp = function(event)
{
	document.removeEventListener("mousemove", this.mousemoveCallback);
	document.removeEventListener("mouseup", this.mouseupCallback);
}
