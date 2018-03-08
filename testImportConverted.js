const xnat = require("./index.js");
const Lab = require('lab');
const lab = exports.lab = Lab.script();
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const os = require('os');
const _ = require('underscore');

const getConfigFile = function () {
    return new Promise(function(resolve, reject){

        try {
            // Try to load the user's personal configuration file
            var conf = path.join(os.homedir(), '.xnat.json');
            resolve(require(conf));
        } catch (e) {
            console.error(e);
            reject(e);
        }
    });
};

loginprom = getConfigFile()
.catch(function(e){
    return xnat.promptUsernamePassword()
    .then(function(user){
        conf.user = user;
        xnat.writeConfFile(conf);
        return conf;
    });
});

lab.experiment("Test xnat REST", function(){
	lab.test('returns true when user is logged in.', function(){

        return loginprom
        .then(function(conf){
            console.log("Setting server url to ", conf.server);
            xnat.setXnatUrl(conf.server);
            console.log("Login to xnat.", conf.server);
            return xnat.login(conf.user);
        });
        
	});

	lab.test('returns true when we get session id', function(){

        return xnat.getSubjectSession("TestUMN1", "838827", "20170109")
        .then(function(sessions){
            // console.log(JSON.stringify(sessions, null, 2));
            console.log(_.map(_.pluck(sessions.items[0].children[0].items, "data_fields"), 
                function(data_field){
                    console.log(data_field)
                    return {
                        ID: data_field.ID, 
                        image_session_ID: data_field.image_session_ID,
                        series_description: data_field.series_description
                    }
                }))
            // for(var i = 0; i < sessions.items.length; i++){
            //     console.log(sessions.items[i])
            // }
        })
        
	});

	lab.test('returns true when user is logged out.', function(){

        return xnat.logout()
        .then(function(res){
            console.log(res);            
        });
        
	});
});