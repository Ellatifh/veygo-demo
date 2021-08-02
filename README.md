# Running on localhost

## On MacOS or linux
* tar xvf vip-platform-web-*.tar*
* cd web/doc/sample
* cp -a ../../js/ js/vip
* run a simple local http server
  ** "npx http-server -p 8000" (nodejs)
  ** "python -m SimpleHTTPServer" (python)
* go to  http://127.0.0.1:8000

## windows
Mostly the same as previously.
* For local server, you can install nodejs msi.
* Copy all files in js/vip with hashes to the one without hashes.
* Run cmd.exe, cd to the sample\ directory, and run "npx http-server -p 8000"

# IE comptability
http://127.0.0.1:8000/index_es5.html made so it can runs on IE11.

es5 stands for EcmaScript 5.

# Development mode
Most server will tell browsers to keep js file in cache.
When modifying a js file, make sure you activate the "disable cache" of your browser.
