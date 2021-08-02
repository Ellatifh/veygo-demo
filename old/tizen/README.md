# setup
## On MacOS or linux (bash script)
* tar xvf vip-platform-web-*.tar*
* cd web/doc/sample

## remove js files which would be compiled/embedded several times in package
* mkdir js/vip && cp -aLr ../../js/es6 js/vip/es6
* rm js/vip/es6/vip-player-*.js js/vip/es6/vip-ext-*-*-*.js js/vip/es6/vip-config-*.js

## copy tizen project files in base directory
* mv tizen/.project tizen/.tproject tizen/config.xml .

## import in Tizen studio
* Tizen Studio > File > Import > Projects from Folder or Arhive
* Launch the simulator with Right-click on project > Run as > Tizen Web simulator application (Samsung TV)
Right-click in simulator to start dev tools.
* Setup a emulator, and Run as or Debug as > Tizen Web Emulator application. vip-player.js will be long to compile (~15 mins on a 8GB RAM machine).
* Or connect to a real Samsung TV. You need one if you work on Widevine streams.
 You need a Samsung Store certificate (as opposed to raw Tizen key), and for that you need the "Samsung Certificate Extension" package, and a samsung account during the certificate creation.

# Tizen Studio
* It's famous you can get a lot of cryptic errors where you don't know how to fix.
* The build of javascript for emulator and real device is very slow (15 mins for an optimized vip-player)
There is no such build for the simulator, or on the CLI (but you cannot use the debugguer in CLI mode).
* DRM: The app crash when try to playing Widevine content on emulator. DRM is unsupported in simulator.
You need a real device to test Widevine.
* Also, you might have errors if you have a .git directory in your project (launch error on simulator).

# Visual Studio
A visual studio is available, and it could be easier to use than Tizen Studio.
