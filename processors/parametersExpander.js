var _ = require('lodash');
var readlineSync = require('readline-sync');

function expandParams(doc,program) {
    var regex = /\${AWS::[a-zA-Z0-9_]*}|\${[a-zA-Z0-9_]*}/gm;
    var values = gatherParams(doc);

    return processRec(doc, values);

    function gatherParams(doc) {
        // dummy defualt values - can be overriden by user parameters

        var values = { 
            "AWS::Region": "us-east-1",
            "AWS::AccountId": "1234567890" 
        };  
        if(process.env.REGION && process.env.ACCOUNT) { 
            var values = { 
                "AWS::Region": process.env.REGION,
                "AWS::AccountId": process.env.ACCOUNT
            };  
        }
        
        // did we recieve params from commandline?
        if (program != null && program.params) {
            try {
                var paramsObj = JSON.parse(program.params);
                if (paramsObj)
                    _.assign(values, paramsObj);
            }
            catch (ex) {
                console.error("Could not parse parameter. Probably not a valid JSON %s %s", program.params, ex);
                process.exit(1);
            }
        }

        if (doc.Parameters) {
            _.forEach(doc.Parameters, function (param, name) {
                if (_.includes(_.keys(values), name))
                    return; // great - we got the parameter from the user via CLI parameter

                // we did not get the param as a commandline parameter - get from the user interactively
                if (program === null) {
                   var answer =  _.includes(_.keys(param),"Default") ? param.Default : "";
                }else{
                    var question = `${name}:${param.Description} [${param.AllowedValues}] Enter for default (${param.Default}):`;
                    var answer = readlineSync.question(question);
                    if (answer === "")
                        answer =   _.includes(_.keys(param),"Default") ? param.Default : "";
                }

                if(param["Type"]==="Number")
                    answer = parseInt(answer);

                console.error(`param  ${name} : ${answer}`);
                values[name] = answer;

            });
        }

        return values;
    }

    function processRec(doc, values) {
        if (_.isPlainObject(doc)) {
            if (doc.Ref && _.includes(_.keys(values), doc.Ref)) //Ref object. Do we know this param? if so replace with a real (expanded) value;
                return values[doc.Ref];
            else return _.mapValues(doc, (child) => processRec(child, values));
        }
        else if (_.isArray(doc))
            return _.map(doc, (elm) => processRec(elm, values));
        else{
            if (regex.test(doc)){
                regex.lastIndex = 0
                while ((m = regex.exec(doc)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }

                    m.forEach((match, _) => {
                        len = match.length
                        key = match.substring(2, len-1)
                        if (values[key]){
                            doc = doc.replace(match, values[key])
                            regex.lastIndex += (values[key].length - match.length)
                        }
                    });

                }
            }
            return doc;
        }
    }
}
exports.process = expandParams;