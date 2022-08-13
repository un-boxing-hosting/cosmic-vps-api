//#region imports
const config = require('./config.json');
const express = require('express');
const bodyParser = require("body-parser");
const prc = require('child_process');
const app = express();
const logger = require(`morgan`);
//#endregion

//#region app use
app.use(bodyParser.json());
app.use(logger(`combined`));
app.use(express.urlencoded({
    extended: true
}))
app.get('/', async (req, res) => {
    respond(res, 200, 'Hello World!');
})
app.get(`/status/setup`, async (req, res) => {
     var authed = await getAuth(req);
        if (authed) {
            respond(res, 200, 'Setup', true);
        } else {
            respond(res, 401, 'Unauthorized', false);
        }

})
app.get(`/project/:id/*`, async (req, res) => {
    var project_id = req.params.id;
    console.log(project_id);
    var authed = await getAuth(req);
    console.log(authed);
    if (authed) {
        console.log(`project ${project_id}`);
        var url = req.url.split("/");
        switch (url[3]) {
            case `status`:
                var stats = await exec(`docker ps -q -f="NAME=pr-${project_id}"`)
                if (!stats) {
                    respond(res, 500, `error getting status`, false)
                } else {
                    respond(res, 200, "ok", true)
                }
                break;
            case `start`:
                var stats = await exec(`docker start pr-${project_id}`)
                if (!stats) {
                    respond(res, 500, `error starting project`, false)
                } else {
                    respond(res, 200, "ok", true)
                }
                break;
            case `stop`:
                var stats = await exec(`docker stop pr-${project_id}`)
                if (!stats) {
                    respond(res, 500, `error stopping project`, false)
                } else {
                    respond(res, 200, "ok", true)
                }
                break;
            case `restart`:
                var stats = await exec(`docker restart pr-${project_id}`)
                if (!stats) {
                    respond(res, 500, `error restarting project`, false)
                } else {
                    respond(res, 200, "ok", true)
                }
                break;
            case `logs`:
                var stats = await exec(`docker logs pr-${project_id}`)
                if (!stats) {
                    respond(res, 500, `error getting logs`, false)
                } else {
                    respond(res, 200, stats, true)
                }
                break;
            case `file`:
                var path = req.query.path;
                // var stats = await exec(`docker exec pr-${project_id} ls -la`)
                respond(res, 200, "notImp", false)
                break;
            case `remove`:
                var path = req.query.path;
                respond(res, 200, "notImp", false)
                break;
            case `uninstall`:
                var module = req.query.module;
                exec(`docker exec pr-${project_id} mpm uninstall ${module}`)
                respond(res, 200, `uninstalled module "${module}"`, true)
                break;
            case `install`:
                var module = req.query.module;
                var stats = exec(`docker exec pr-${project_id} mpm install ${module}`)
                if (!stats) {
                    respond(res, 500, `error installing module "${module}"`, false)
                } else {
                    respond(res, 200, `installed module "${module}"`, true)
                }
                break;
                case `command`:
                    var cmd = req.query.cmd;
                    var root = req.query.root;
                    if(root == true){
                        var stats = await exec(`docker exec pr-${project_id} sudo ${cmd}`)
                    }else{
                        var stats = await exec(`docker exec -it pr-${project_id} ${cmd}`)
                    }
        }

    } else {
        respond(res, 401, "Unauthorized", false);
    }

})
app.use(`/manage/*`, async (req, res) => {
    var authed = await getAuth(req);
    if (authed) {
        var url = req.url.split("/");
        switch (url[2]) {
            case `image`:
                switch (url[3]) {
                    case `create`:
                        // create or update image
                      
                        var stats = await exec(`docker build .`)
                        if (!stats) {
                            respond(res, 500, `error creating image`, false)
                        } else {
                            respond(res, 200, "ok", true)
                        }
                          respond(res, 200, "notImp", false)
                        break;
                    case `build`:
                        // build docker file


                          respond(res, 200, "notImp", false)
                        break;
                }
                break;
            case `project`:
                switch (url[3]) {
                    case `create`:
                        var id = req.query.id
                            respond(res, 200, "notImp", false)
                            break;
                    case `delete`:
                        var id = req.query.id
                            respond(res, 200, "notImp", false)
                            break;
                }
                break;
            case `command`:
                var cmd = req.query.cmd;
                var stats = await exec(cmd)
                if (!stats) {
                    respond(res, 500, `error executing command "${cmd}"`, false)
                }
                respond(res, 200, stats, true)
        }
    }else{
        respond(res, 401, "Unauthorized", false);
    }

})

//#endregion

//#region functions
async function getAuth(req) {
    let auth = req.headers.authorization;
    console.log(auth);
    if (auth == config.auth) {
        return true;
    }
    return false;
}
async function respond(res, code, message, success) {

    res.send({
        success: success,
        code: code,
        message: message
    })

}
async function exec(command) {
    prc.exec(command, function (error, stdout, stderr) {
        if (error) {
            console.log(error);
            return false;

        } else {
            console.log(stderr);
            console.log(stdout);
            return stdout;
        }
    });
}
//#endregion

app.listen(config.port, () => {
    console.log(`Listening on port ${config.port}`);
})
app.set("port", config.port);
module.exports = {
    app
}

/*
/status/setup - check
if docker is installed and certain npm packages
for a project type.

    /
    project / {
        project_id
    }
/status - check if the docker process is running need to exec(docker ps -q --filter="NAME=pr-{project_id}") /
project / {
    project_id
}
/stop - stop the project docker container /
project / {
    project_id
}
/restart - restart the project docker container /
project / {
    project_id
}
/start - start the project docker container /
project / {
    project_id
}
/logs - get the docker container logs /
project / {
    project_id
}
/file?path= - create or update a file in the container. /
project / {
        project_id / remove ? path = -delete a file in the container. /
        project / {
            project_id
        }
        /install?module= - install a module in the project container. /
        project / {
            project_id
        }
        /uninstall?module= - uninstall a module in the project container. /
        project / {
            project_id
        }
        /modules - get a list of npm modules installed from container package.json /
        project / {
            project_id
        }
        /command?cmd=ls&root=false - run a command in the docker container with optional root user.

        /
        manage / image / create - create or update a Dockerfile
        for the build process /
        manage / image / build - build the Dockerfile /
        manage / project / create ? id = -create a project container with the dockerfile build and run it /
        manage / project / delete ? id = -delete a project container. /
        manage / command ? cmd = ls - run a command on the host machine.
*/