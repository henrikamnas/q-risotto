## q-risotto

**Q**lik **R**EST **I**n **S**ense (**otto**) - a RESTful Engine API wrapper

Inspired by project [chartcacher] by [Alexander Karlsson]. 

[chartcacher]: https://github.com/mindspank/chartcacher
[Alexander Karlsson]: https://github.com/mindspank

![q-risotto](./q-risotto-logo.png)

The intention was to provide an easy access to apps, objects and its data on a Qlik Sense server thru a REST API to integrate with other systems.

The development state of this API is at the very beginning and highly incomplete, so more or less raw and unground. But see yourself.

### Endpoints

See also: [routes.js](./sources/routes/routes.js)

GET **/v1/docs** - all docs on server, returns getDocList().**qDocList**

GET **/v1/doc/{docId}** - app layout, returns getAppLayout().**qLayout**

GET **/v1/doc/{docId}/objects** - all objects of app, returns getAllInfos().**qInfos**

GET **/v1/doc/{docId}/serialize** - serialize an app into a JSON object, more details here: [mindspank/serializeapp](https://github.com/mindspank/serializeapp)

GET **/v1/doc/{docId}/object/{objId}** - object layout, returns getLayout().**qLayout**

GET **/v1/doc/{docId}/object/{objId}/layout** - layout data, returns getLayout().**qLayout** depending on object type it contains qHyperCube and qDataPages

GET **/v1/doc/{docId}/object/{objId}/data** - object data, returns first data page of either getLayout().**qHyperCube** or **qListObject** depending on object type chart/listbox, not data for pivot tables

GET **/v1/doc/{docId}/object/{objId}/pivotdata** - object data, returns getLayout().**qPivotDataPages** for pivot tables

GET **/v1/doc/{docId}/object/{objId}/layers** - object data, returns getLayout().**layers** for maps

POST **/v1/doc/{docId}/hypercube** - give a column list array or HyperCubeDef JSON as payload (request body) and get back the evaluated getLayout().**qHyperCube**, without data page

**Examples for payload to define a hypercube:**

1. a list of columns as string, measures start with equal sign, all others are treated as dimensions (hint: use brackets for dimensions):
```
[
    "[Date.autoCalendar.Date]",
    "[Case Owner Group]",
    "=Avg([Case Duration Time])",
    "=Count({$<Status -={'Closed'} >} Distinct %CaseId )"
]
```
2. a list of NxDimension and NxMeasure structure objects, can be mixed with column strings like in 1.:
```
 [
    "[Date.autoCalendar.Date]",
    {"qDef": {"qFieldDefs": ["Case Owner Group"], "qFieldLabels": ["Group"]}},
    {"qDef": {"qDef": "=Avg([Case Duration Time])", "qLabel": "Avg Case Duration Time"}},
    {"qDef": {"qDef": "=Count({$<Status -={'Closed'} >} Distinct %CaseId )", "qLabel": "Open Cases"}}
]
```
3. a HyperCubeDef (see link below)

See Qlik help also:

* [Columns]
* [NxDimension]
* [NxMeasure]
* [HyperCubeDef]

[Columns]: http://help.qlik.com/en-US/sense-developer/November2017/Subsystems/APIs/Content/QlikVisual/qlik-visual-columns.htm
[NxDimension]: http://help.qlik.com/en-US/sense-developer/November2017/Subsystems/EngineAPI/Content/Structs/NxDimension.htm
[NxMeasure]: http://help.qlik.com/en-US/sense-developer/November2017/Subsystems/EngineAPI/Content/Structs/NxMeasureInfo.htm
[HyperCubeDef]: http://help.qlik.com/en-US/sense-developer/November2017/Subsystems/EngineAPI/Content/Structs/HyperCubeDef.htm

POST **/v1/doc/{docId}/hypercube/size** - give a give a column list array or HyperCubeDef JSON as payload (request body) and get back the evaluated size of getLayout().**qHyperCube** as the following JSON object:
```
{
    "columns": 3,
    "rows": 89,
    "pages": 1
}
```

POST **/v1/doc/{docId}/hypercube/json/{pageNo\*}** - give agive a column list array or HyperCubeDef JSON as payload (request body) and get back the evaluated getLayout().qHyperCube.**qDataPages[0].qMatrix** (the first data page or page number given as last URL param) transformed into a **JSON collection** of data rows (eg. easy to use with Qlik REST Connector), date and timestamps are delivered in UTC-time:
```
[
    {
        "Date": "2014-10-11T22:00:00.000Z",
        "Cumulative New Cases": 4,
        "Cumulative Closed Cases": 0
    },
    {
        "Date": "2014-10-18T22:00:00.000Z",
        "Cumulative New Cases": 5,
        "Cumulative Closed Cases": 3
    },
...
]
```

### Static Resources

GET /**wdc** - Tableau WDC to connect q-risotto endpoint /v1/doc/{docId}/hypercube/json

### Installing

`cd sources`

`npm install`

### Qlik Sense Service Dispatcher Integration (server)

* Copy the files manually with admin priviliges into  
```C:\Program Files\Qlik\Sense\ServiceDispatcher\Node\q-risotto\```  

* Then append the following configuration options to  
```C:\Program Files\Qlik\Sense\ServiceDispatcher\services.conf```  
This will let the Service Dispatcher know how to run the module, this step has to be re-applied in an upgrade of Qlik Sense Server.

```
[q-risotto]
Identity=Qlik.q-risotto
Enabled=true
DisplayName=q-risotto
ExecType=nodejs
ExePath=Node\node.exe
Script=Node\q-risotto\server.js

[q-risotto.parameters]
```

### Qlik Sense Service Dispatcher Integration (desktop)

* Copy the files manually with admin priviliges into  
```C:\Users\[USERNAME]\AppData\Local\Programs\Qlik\Sense\ServiceDispatcher\Node\q-risotto\```  

* Then append the following configuration options to  
```C:\Users\[USERNAME]\AppData\Local\Programs\Qlik\Sense\ServiceDispatcher\services.conf```  
This will let the Service Dispatcher know how to run the module, this step has to be re-applied in an upgrade of Qlik Sense Server.

```
[q-risotto]
Identity=Qlik.q-risotto
Enabled=true
DisplayName=q-risotto
ExecType=nodejs
ExePath=Node\node.exe
Script=Node\q-risotto\server.js

[q-risotto.parameters]
```
### Qlik Sense Server Integration

Adjust ```./src/config/config.json``` to work with a Qlik Sense Server like this:

```
{
    "enigmaSchema": "enigma.js/schemas/12.34.11.json",
    "engineHost": "<your Qlik Sense Server hostname or IP>",
    "enginePort": 4747,
    "globalAppId": "engineData",
    "userDirectory": "Internal",
    "userId": "sa_repository",
    "certificatesPath": "C:/ProgramData/Qlik/Sense/Repository/Exported Certificates/.Local Certificates",
    "port": 3000
}

```

### Qlik Sense Desktop Integration
Adjust ```./src/config/config.json``` to work with a Qlik Sense Desktop like this:

...
{
    "enigmaSchema": "enigma.js/schemas/12.170.2.json",
    "engineHost": "localhost",
    "enginePort": 4848,
    "globalAppId": "engineData",
    "userDirectory": null,
    "userId": null,
    "certificatesPath": null,
    "port": 3000,
    "unsecure": false
}

...

### Qlik Core Integration

Adjust ```./src/config/config.json``` to work with the dockerized QIX engine like this:

```
{
    "enigmaSchema": "enigma.js/schemas/12.34.11.json",
    "engineHost": "qix-engine",
    "enginePort": 9076,
    "globalAppId": "engineData",
    "userDirectory": null,
    "userId": null,
    "certificatesPath": null,
    "port": 3000
}
```

Use the ```docker-compose.yml``` file provided in the repo and start it:

```
docker-compose up
```


### Usage

#### Config

See [config.json](./sources/src/config/config.json) for configurations.

Start on Qlik Sense server with `npm start` or integrate into Qlik Sense ServiceDispatcher.

Navigate with browser or other tools to `https://<qlik sense server name>:1338/<endpoint>`

#### Postman

Test q-risotto API calls with Postman:
![q-risotto with Postman](postman-example.png)

#### QlikView

Use QlikView with the Qlik REST Connector to retrieve data from Qlik Sense:
![q-risotto with QlikView REST connector](qlikview-example.png)
![q-risotto with QlikView REST connector 2](qlikview-example-2.png)

#### Tableau

Use q-risotto WDC with Tableau to retrieve data from Qlik Sense:
![q-risotto with Tableau](tableau-example.png)
![q-risotto with Tableau](tableau-example-2.png)
![q-risotto with Tableau](tableau-example-3.png)

#### R Integration

Use q-risotto in your R environment and retrieve data from Qlik Sense. Here you will find the R convenience package 'senser' to wrap q-risotto and complex Qlik structs like qHyperCubeDef:

[https://github.com/ralfbecher/senser](https://github.com/ralfbecher/senser)

![Using senser R package](senser.R-usage.jpg)

***

### Author

**Ralf Becher**

* [irregular.bi](http://irregular.bi)
* [twitter/irregularbi](http://twitter.com/irregularbi)
* [github.com/ralfbecher](http://github.com/ralfbecher)

[irregular.bi]: http://irregular.bi
[twitter/irregularbi]: http://twitter.com/irregularbi
[github.com/ralfbecher]: http://github.com/ralfbecher

### License

Copyright © 2016 Ralf Becher

Released under the MIT license.

***
