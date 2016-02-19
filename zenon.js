/*
Name:		zenon.js
Version:	1.0.0
Update:		14/02/2016 16:00 (GTM+2)
Author:		Jérémie Garcelon

Copyright:	Copyright (C) 2016 Jérémie Garcelon
License:	Released under the MIT license
*/

////////////////////////////////////////
///// Zenon

var Zenon=(function(){

	// Inner namespace
	var Zenon=function(){};

	////////////////////////////////////////

	////////////
	// Constructor

	Zenon.instance=function(audioCtx, options){
		this.audioCtx=audioCtx;
		// Loader
		this.loaderLoading=false;
		this.loaderInitCallback=null;
		this.loaderCompleteCallback=null;
		this.loaderSucessCallback=null;
		this.loaderLoadedCallback=null;
		this.loaderErrorCallback=null;
		// Cache
		this.cache=new Array();
		this.cacheDepth=0;
		// Player
		this.playerMasterGain=this.audioCtx.createGain();
			this.playerMasterGain.gain.value=0.5;
		this.playerBufferLoaded=false;
		this.playerBuffer;
		this.playerBufferSource;
		this.playerPlaying=false;
		this.playerStartedAt=0;
		this.playerPausedAt=0;
		// Play animation
		this.animationFrame;
		// State
		this.zoom=0;
		this.drawStart=0;
		// Canvas
		this.canvas=document.createElement('canvas');
			this.canvas.width=600;
			this.canvas.height=150;
		this.drawPadding=3;
		this.drawColor='#1199ee';
		// Controls
		this.setMouseWheelZoomControl();
		this.setDragScrollControl();
		// Options
		if(options){
			this.set(options);
		}

	};

	////////////
	// Options

	Zenon.instance.prototype.set=function(options){
		// Loader
		if(options.loaderInitCallback){
			this.loaderInitCallback=options.loaderInitCallback;
		}
		if(options.loaderCompleteCallback){
			this.loaderCompleteCallback=options.loaderCompleteCallback;
		}
		if(options.loaderSucessCallback){
			this.loaderSucessCallback=options.loaderSucessCallback;
		}
		if(options.loaderLoadedCallback){
			this.loaderLoadedCallback=options.loaderLoadedCallback;
		}
		if(options.loaderErrorCallback){
			this.loaderErrorCallback=options.loaderErrorCallback;
		}
		// canvas
		if(options.canvasWidth){
			this.canvas.width=options.canvasWidth;
		}
		if(options.canvasHeight){
			this.canvas.height=options.canvasHeight;
		}
		if(options.drawPadding){
			this.drawPadding=options.drawPadding;
		}
		if(options.drawColor){
			this.drawColor=options.drawColor;
		}
	};

	////////////
	// Loader

	Zenon.instance.prototype.loadFromUrl=function(url){
		if(this.loaderLoading == false){
			this.loaderLoading=true;
			///////
			this.playerBufferLoaded=false;
			///////
			if(this.loaderInitCallback){
				this.loaderInitCallback();
			}
			var xhr=new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType='arraybuffer';
			var that=this;
			xhr.addEventListener('progress', function(event){
				if(that.loaderCompleteCallback){
					var complete=(event.loaded/event.total)*100;
					that.loaderCompleteCallback(complete);
				}
			}, false);
			xhr.addEventListener('readystatechange', function(){
			if(xhr.readyState == 4){
				if(xhr.status == 200){
					if(that.loaderSucessCallback){
						that.loaderSucessCallback();
					}
					that.audioCtx.decodeAudioData(xhr.response, function(buffer){
						///////
						that.cacheInit(buffer);
						that.playerSetBuffer(buffer);
						that.zoom=0;
						that.drawStart=0;
						that.draw();
						///////
						if(that.loaderLoadedCallback){
							that.loaderLoadedCallback(buffer);
						}
						that.loaderLoading=false;
					});
				}
				else{
					if(that.loaderErrorCallback){
						that.loaderErrorCallback(xhr.status, xhr.statusTex);
					}
					that.loaderLoading=false;
				}
			}
			}, false);
			xhr.send();
		}
	};

	////////////
	// Cache

	Zenon.instance.prototype.cacheInit=function(buffer){
		// How many times we have to summarize the buffer for a number of samples which will be lower than the width of the canvas
		this.cacheDepth=Math.ceil(Math.log(buffer.length/this.canvas.width)/Math.log(2));
		this.cache[this.cacheDepth]={
			mini : buffer,
			maxi : buffer
		}
		for(var i=this.cacheDepth; i > 0; i--){
			this.cache[i-1]=this.cacheSummarize(this.cache[i]);
		}
	};

	Zenon.instance.prototype.cacheSummarize=function(cache){
		var numberOfChannels=cache.mini.numberOfChannels;
		var bufferLength=cache.mini.length;
		var summarized={
			mini : this.audioCtx.createBuffer(numberOfChannels, Math.ceil(bufferLength/2), this.audioCtx.sampleRate),
			maxi : this.audioCtx.createBuffer(numberOfChannels, Math.ceil(bufferLength/2), this.audioCtx.sampleRate)
		}
		var cache_mini_ChannelData, cache_maxi_ChannelData, summarized_mini_ChannelData, summarized_maxi_ChannelData;
		var sample=0;
		for(var channel=0; channel < numberOfChannels; channel++){
			cache_mini_ChannelData=cache.mini.getChannelData(channel);
			cache_maxi_ChannelData=cache.maxi.getChannelData(channel);
			summarized_mini_ChannelData=summarized.mini.getChannelData(channel);
			summarized_maxi_ChannelData=summarized.maxi.getChannelData(channel);
			sample=0;
			for(var i=0; i < bufferLength; i+=2){
				summarized_mini_ChannelData[sample]=Math.min(cache_mini_ChannelData[i], cache_mini_ChannelData[i+1]);
				summarized_maxi_ChannelData[sample]=Math.max(cache_maxi_ChannelData[i], cache_maxi_ChannelData[i+1]);
			sample++;
			}
		}
		return summarized;
	};

	////////////
	// Player

	Zenon.instance.prototype.connect=function(audioNode){
		this.playerMasterGain.connect(audioNode)
	};

	Zenon.instance.prototype.disconnect=function(){
		this.playerMasterGain.disconnect();
	};

	Zenon.instance.prototype.playerSetBuffer=function(buffer){
		this.playerBuffer=buffer;
		this.playerBufferLoaded=true;
	};

	Zenon.instance.prototype.play=function(){
		if(this.playerPlaying == false && this.playerBufferLoaded == true){
		this.playerPlaying=true;
			this.playerBufferSource=this.audioCtx.createBufferSource();
			this.playerBufferSource.buffer=this.playerBuffer;
			this.playerBufferSource.connect(this.playerMasterGain);
			this.playerBufferSource.start(0,this.playerPausedAt);
			this.playerStartedAt=this.audioCtx.currentTime-this.playerPausedAt;
			this.playerPausedAt=0;
			// play animation
			this.drawStart=0;
			this.playAnimationPlay();
		}
	};

	Zenon.instance.prototype.pause=function(){
		if(this.playerPlaying == true && this.playerBufferLoaded == true){
		this.playerPlaying=false;
			this.playerBufferSource.stop(0);
			this.playerPausedAt=this.audioCtx.currentTime-this.playerStartedAt;
			// play animation
			this.playAnimationStop();
		}
	};

	Zenon.instance.prototype.stop=function(){
		if(this.playerBufferLoaded == true){
			if(this.playerPlaying == true){
				this.playerBufferSource.stop(0);
			}
			this.playerPlaying=false;
			this.playerStartedAt=0;
			this.playerPausedAt=0;
			// play animation
			this.playAnimationStop();
			this.drawStart=0;
			this.draw();
		}
	};

	////////////
	// Play animation

	// @TODO Have to interrupt the animation when buffer is fully played
	Zenon.instance.prototype.playAnimationPlay=function(){
		this.drawStart=this.playAnimationGetDrawStart();
		this.draw();
		this.animationFrame=window.requestAnimationFrame(this.playAnimationPlay.bind(this));
	};

	Zenon.instance.prototype.playAnimationStop=function(){
		window.cancelAnimationFrame(this.animationFrame);
	};

	// @TODO Can cache some operation. Seems there is a problem on duration calculation (have to use length ?). 
	Zenon.instance.prototype.playAnimationGetDrawStart=function(){
		return Math.round( ((this.audioCtx.currentTime-this.playerStartedAt)/this.playerBuffer.duration) * this.cache[0].mini.length * Math.pow(2,this.zoom) );
	};

	////////////
	// Canvas

	Zenon.instance.prototype.draw=function(){
		var cache=this.cache;
		var context=this.canvas.getContext('2d');
		var canvasWidth=this.canvas.width;
		var canvasHeight=this.canvas.height;
		var drawStart=this.drawStart;
			context.fillStyle=this.drawColor;
			context.clearRect(0, 0, canvasWidth, canvasHeight);
		var numberOfChannels=cache[0].mini.numberOfChannels;
		var amplitude=(canvasHeight/2)/numberOfChannels;
		var drawAmplitude=Math.round(amplitude-this.drawPadding);
		var offset;
		var y_min, y_max, prev_y_min, prev_y_max, h;
		var mini_ChannelData, maxi_ChannelData;
		for(var channel=0; channel < numberOfChannels; channel++){
			mini_ChannelData=cache[this.zoom].mini.getChannelData(channel);
			maxi_ChannelData=cache[this.zoom].maxi.getChannelData(channel);
			offset=((amplitude*2)*channel)+amplitude;
					prev_y_min=offset;
					prev_y_max=offset;
			for(var x=0; x < canvasWidth; x++){
				y_min=Math.round( (-mini_ChannelData[x+drawStart]*drawAmplitude)+offset );
				y_max=Math.round( (-maxi_ChannelData[x+drawStart]*drawAmplitude)+offset );
					if(y_min < prev_y_max){
						y_min=prev_y_max;
					}
					if(y_max > prev_y_min){
						y_max=prev_y_min;
					}
					prev_y_min=y_min;
					prev_y_max=y_max;
				h=y_min-y_max;
					if(h == 0){h=1;}
				context.fillRect(x, y_max, 1, h);	// x,y,w,h
			}
		}
	};

	////////////
	// State

	Zenon.instance.prototype.zoomIn=function(mousepos_x){
		if(this.zoom < (this.cache.length-1) ){
			this.zoom++;
			this.drawStart=(this.drawStart*2)+(mousepos_x*2)-mousepos_x;
			this.draw();
		}
	};

	Zenon.instance.prototype.zoomOut=function(mousepos_x){
		if(this.zoom > 0){
			this.zoom--;
			if(this.zoom < 1 ){
				this.drawStart=0;	
			}
			else{
				this.drawStart=Math.round((this.drawStart/2)+(mousepos_x/2)-mousepos_x);
			}
			this.draw();
		}
	};

	Zenon.instance.prototype.scoll=function(move_x){
		this.drawStart=this.drawStart+move_x;
	};

	////////////////////////////////////////
	// Controls

	Zenon.instance.prototype.setMouseWheelZoomControl=function(){
		// Mouseweel zoom control
		var that=this;
		Zenon.onMouseWheel(that.canvas, function(delta, event){
			var mousepos_x=event.clientX-this.getBoundingClientRect().left;
			if(delta > 0){
				that.zoomIn(mousepos_x);
			}
			else{
				that.zoomOut(mousepos_x);
			}
		});
	};

	// @TODO Can merge the draw update logic with that of the player.
	Zenon.instance.prototype.updateDraw=function(){
		this.draw();
		this.animationFrame=window.requestAnimationFrame(this.updateDraw.bind(this));
	};

	Zenon.instance.prototype.setDragScrollControl=function(){
		// Mousedrag scroll control
		var that=this;
		Zenon.onDrag(that.canvas,
			// mousedown
			function(){
				if(that.playerPlaying == false){
					that.updateDraw();
				}
			},
			// mousemove
			function(move){
				if(that.playerPlaying == false){
					that.scoll(move.x);
				}
			},
			// mouseup
			function(){
				if(that.playerPlaying == false){
					window.cancelAnimationFrame(that.animationFrame);
				}
			}
		);

	};

	////////////////////////////////////////
	// Event handlers

	////////////
	// Simple mousewheel event handler

	Zenon.onMouseWheelHandler=function(elem, event, fct){
		var delta=0;
		if(event.wheelDelta){
			delta=event.wheelDelta/120;
		}
		else if(event.detail){
			delta=-event.detail/3;
		}
		//
		if(delta != 0){
			fct.call(elem, delta, event);
		}
		event.preventDefault();
	};

	Zenon.onMouseWheel=function(elem, fct){
		// @TODO Better way to be cross browser ?
		elem.addEventListener('mousewheel', function(event){Zenon.onMouseWheelHandler(elem, event, fct);}, false);
		elem.addEventListener('DOMMouseScroll', function(event){Zenon.onMouseWheelHandler(elem, event, fct);}, false);
	};

	////////////
	// Simple drag handler

	Zenon.onDrag=function(elem, mousedown, mousemove, mouseup){
		var dragstart=null;	// @TODO member var is bad ?
		elem.addEventListener('mousedown', function(event){
			var bcr=this.getBoundingClientRect();	
			var mousepos={
				x : event.clientX-bcr.left,
				y : event.clientY-bcr.top
			}
			dragstart=mousepos;
			mousedown.call(this, mousepos, event);
		});
		elem.addEventListener('mousemove', function(event){
			if(dragstart != null){
				var bcr=this.getBoundingClientRect();
				var mousepos={
					x : event.clientX-bcr.left,
					y : event.clientY-bcr.top
				}
				var move={
					x : dragstart.x-mousepos.x,
					y : dragstart.y-mousepos.y
				}
				dragstart=mousepos;
				mousemove.call(this, move, mousepos, event);
			}
		});
		elem.addEventListener('mouseup', function(event){
			var bcr=this.getBoundingClientRect();
			var mousepos={
				x : event.clientX-bcr.left,
				y : event.clientY-bcr.top
			}
			dragstart=null;
			mouseup.call(this, mousepos, event);
		});
	};

	////////////////////////////////////////

	return Zenon;
})();








