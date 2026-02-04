# Kilroy Apps
Kilroy lets developers and users quickly create self-contained applications. Using Kilroy's drag-and-drop editors,
users can quickly design rich, interactive interfaces that can be powered by Kilroy's dozens of built-in functions,
or can be extended using standard Javascript.

Kilroy apps differ from traditional application executables in that they are almost exclusively made up of
structured JSON data objects. A fully featured Kilroy app can contain all of the user interface, server API
functions, HTML, images, and other media needed to create a Web2 or Web3 application.

Kilroy apps are completely self-contained in a digitally signed zip archive, which can be shared online through
the Kilroy App store.

# Parts of a Kilroy App
## The App Folder
## The Manifest File
The manifest.json file looks like:

```json linenums="1"
{
    "manifestVersion": 2,
    "id"            : "kilroy.sample",
    "displayName"   : "Kilroy Sample App",
    "desc"          : "Sample KApp skeleton",
    "version"       : "1.1",
    "author"        : "Kilroy BC, LLC",
    "authorInfoUrl" : "http://kilroy.tech",
    "appInfoUrl"    : "/apps/kilroy.sample/info.html",
    "appImageUrl"   : "https://kilroydao.com/wp-content/uploads/2022/04/kilroy-transparent-cropped-1.png",
    "locked"        : true,
    "override"      : true,
    "hidden"        : false,
    "pdClasses": {
        "sample"    : {
            "pdName" : "sample",
            "pdAlias": "kilroy.sample",
            "desc"  : "Kilroy Sample App",
            "runOnStart": true,
            "visible": true,
            "multipleAllowed": false,
            "init"  : "init_hook",
            "resume": "resume_hook",
            "pause" : "pause_hook",
            "stop"  : "stop_hook"
        },
        "widget"    : {
            "pdName" : "widget",
            "pdAlias": "kilroy.sample.widget",
            "desc"  : "Kilroy Sample App Widget",
            "runOnStart": false,
            "visible": true,
            "multipleAllowed": true,
            "init"  : "init_hook",
            "resume": "resume_hook",
            "pause" : "pause_hook",
            "stop"  : "stop_hook"
        }
    }
}
```

```html
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
    <meta name="description" content="Description">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0">
```

```javascript
function preflight(authData, wfProxy) {
	//called before the workflow steps run
    debug ("preflight");
	return Promise.resolve({success: true});
}
```

## Process Diagrams
## Workflows
## Public Folder

# Creating an App

# Build, Test, Distribute

---
[Prev (About Kilroy)](index.md) 