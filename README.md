#Zenon.js

##HTML5 audio waveform visualizer

###Features

- **Zoom** up to the sample accuracy
- Control the zoom with the mouse wheel
- **Scroll** the waveform
- Control the scroll with mouse drag
- The waveform scrolls during playback
- Multichannel
- Customisable


![Zenon.js screenshot](https://github.com/JeremieGarcelon/Zenon.js/blob/master/screenshot-01.png)

###What is this for ?
 
It is a component for **creating audio applications**.

### Under development

Zenon.js is under development (see 'Contribute') but you can play with it "as is".

###How to use ?

Browse the commented exemple code :  
[/examples/basic.html](https://github.com/JeremieGarcelon/Zenon.js/blob/master/examples/basic.html)

Note that you can load directly from a buffer (instead of an url) with :

```javascript
zenon.loadFromBuffer(buffer);
```

###How it works ?

- Zoom levels data are cached (wink to the Zenon's paradox)
- Audio buffers are used to relieve the javascript environment of zoom levels data
- Canvas have better performance with vertical bars


###Contribute ?

For now, it's "hacky" to adapt the code to your needs.  
It will be necessary to implement some hooks and some enable/disable options.  

So, there is imperfections in the code.  
Sometimes, I have doubts about the right way to do.  
I mark it all in the code with @TODO 

**Let me know your needs** or make a pull request.

###What next ?

A signifiant feature will be the possibily to select a fragment of audio (to make loops).
