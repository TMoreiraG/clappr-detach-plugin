var player = new Clappr.Player({
  source: "http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4",
  poster: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HelloWorld.svg/512px-HelloWorld.svg.png",
  parentId: "#player",
  plugins: {
    core: [ DetachPlugin ]
  }
});
