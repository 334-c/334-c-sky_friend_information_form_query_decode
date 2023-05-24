const utils = require("./utils");

const routers = initRouters();

/** @param {import("./utils").app} app  */
module.exports = (app)=>{
    let apiList = [];
    for (const key in routers) {
        if (typeof routers[key] == "function") {
            let api = "/" + key;
            app.all(api, routers[key]);
            apiList.push(api);
        }
    }
    utils.logger.log("接口总数" + apiList.length, apiList);
}

/** 获取接口 */
function initRouters(){
    return {
        /** 解码 */
        decode(req, res) {
            let params = utils.getRequestParams(req);
            let data;
            try{
                data = utils.decode(params);
                utils.userDto(data)
            } catch(err){
                data = utils.readError(err);
            }
            res.send(data);
        },
        /** 更新配置文件 */
        upconf(req, res) {
            let params = utils.getRequestParams(req);
            let data;
            try{
                utils.upconf(params);
                data = "已更新";
            } catch(err){
                data = utils.readError(err);
            }
            res.send(data);
        },
        /** 鉴定权限 */
        auth(req, res) {
            let { authKey } = utils.getRequestParams(req);
            res.send(authKey == utils.config.authKey);
        }
    }
}