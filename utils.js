const configPath = "./config.json";
const express = require('express'),
    fs = require("fs"),
    path = require("path"),
    CryptoJS = require("crypto-js"),
    config = require("./config.json");
const logger = console;
const app = express();
const crypto = getCrypto();
const userKeys = Object.keys({
    "updateTime": "更新时间",
    "language": "中文",
    // "agereement": true,
    "server": ["区服"],
    // "auth": ["权限"],
    "wantType": ["需求类型"],
    "contact": ["联系方式"],
    "age": "年龄",
    "gender": "性别",
    "introduction": "自述",
    "request": "需求",
    "pictures": []
});
const local = {
    config, app, 
    logger, fs, path,
    init(){
        console.log("初始化中...");
        
        // form 数据解析
        app.use(express.urlencoded({ extended: true /* 是否转换成对象 */}));
        // json 数据解析
        app.use(express.json({}));

        require("./routers")(app);

        console.log("初始化完成");
    },
    /**
     * 解码
     * @param {{ data: ["字符串需要解码的数据"], id: "唯一id" }} param0 
     */
    decode({ data, id }) {
        let key = config.ids[id] || config.key;
        // 检测更新配置
        if(local.config.nextReadTime < Date.now()) {
            let editTime = local.readConfLastEditTime();
            if(local.config.lastVersionTime < editTime) {
                let newConfig = JSON.parse(fs.readFileSync(configPath).toString());
                for (const key in newConfig) {
                    local.config[key] = newConfig[key];
                }
                local.config.lastReadTime = Date.now();
            }
        }
        // 检测id是否授权
        if(local.config.ids.indexOf(id) < 0) throw new Error("id未授权!");
        // 解码操作
        data.forEach(d=>{
            // TODO 不知道是哪里导致被包裹了一层双引号
            // d.data = crypto.decode(key, d.data);
            d.data = crypto.decode(key, eval("(" + d.data + ")"));
            try{
            }catch(err){
                console.log("解密数据转成对象失败", err.message);
                console.log(d.data);
            }
        });
        return data;
    },
    /**
     * 更新配置
     * @param {{ key: "长度大于等于10的字符串", authKey: "长度大于等于10的字符串", updateTime: 1683985000000, ids: ["授权id"] }}} param0 参数
     */
    upconf({ key, authKey, updateTime, ids }) {
        // TODO 这里应该校验上次的密钥
        if(updateTime < config.updateTime) throw Error("不允许降级跟新配置! 配置时间小于服务器配置时间! 服务器配置时间: " + config.updateTime);
        if(key.length < 10) throw Error("密钥长度不能小于10, 当前密钥长度为: " + key.length);
        if(authKey.length < 10) throw Error("密钥长度不能小于10, 当前密钥长度为: " + key.length);
        if(!(ids instanceof Array)) throw new Error("ids字段不是数组! 它是: " + ids);
        local.config.key = key;
        local.config.authKey = authKey;
        local.config.updateTime = updateTime;
        local.config.ids = ids;
        local.saveConf();
        local.config.lastVersionTime = local.readConfLastEditTime();
    },
    /**
     * 保存配置
     */
    saveConf(){
        fs.writeFileSync(configPath, JSON.stringify(local.config));
    },
    readConfLastEditTime(){
        return fs.statSync(configPath).mtime;
    },
    /**
     * 获取请求参数对象，query的参数优先级比body的高
     * @param {Requets} req 
     * @returns {Object} 
     */
    getRequestParams(req){
        let re = {};
        if(typeof req.body == "object") {
            re = Object.assign(re, req.body);
        }
        if(typeof req.query == "object") {
            re = Object.assign(re, req.query);
        }
        return  re;
    },
    /**
     * 读取错误信息，不是Error类型就返回自己
     * @param {Error} err 
     * @returns {message:string, stack: Error.stack}
     */
    readError(err) {
        return (err instanceof Error) ? {
            message: err.message, 
            stack: err.stack
        } : err;
    },
    /**
     * 处理用户数据
     * @param {[{data: "{age: 18}", id: 2, isDetele: false}]} users 
     */
    userDto(users) {
        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            if(user.isDelete) {
                users.splice(i, 1);
                i--;
                continue;
            }
            try{
                let userData = JSON.parse(user.data);
                for (const key in user) {
                    delete user[key]
                }
                for (const k of userKeys) {
                    user[k] = userData[k];
                }
            }catch(e){
                console.log("解析异常", e)
            }
        }
    }
};
module.exports = local;

/**
 * 获取编解码对象
 * @returns {Object} 编解码对象
 */
function getCrypto(){
    return {
        /**
         * 计算预留位置
         * @param {String} key 
         * @param {Number} len 
         * @returns 
         */
        getArray(key, len) {
            let md5 = CryptoJS.MD5(key).toString();
            let chs = [];
            md5.split("").forEach(ch=>{
                chs.push(ch.charCodeAt());
            });
            let re = new Array(len), sort;
            for (let i = 0; i < len; i++) {
                let index = chs[i%chs.length];
                let nowIndex = index % len;
                do {
                    if(re[nowIndex] === undefined) {
                        re[nowIndex] = i;
                        sort = !sort;
                        break;
                    } else {
                        if(sort) {
                            index++;
                        } else {
                            index--;
                            if(index < 0 ) index = len - 1;
                        }
                        nowIndex = index % len;
                    }
                }while(true);
            }
            return re;
        },
    
        /**
         * 加密
         * @param {String} key 密钥
         * @param {Any} data 参数
         * @returns {String}
         */
        encode(key, data) {
            if(typeof data != "string") data = JSON.stringify(data);
            let re = this.getArray(key, data.length);
            re.forEach((j,i)=>{
                re[i] = data[j];
            });
            re = re.join("");
            return re;
        },
        /**
         * 解密
         * @param {String} key 密钥
         * @param {String} data 参数
         * @returns {String}
         */
        decode(key, data) {
            let re = this.getArray(key, data.length);
            let text = new Array(data.length);
            data = data.split("");
            re.forEach((j,i)=>{
                text[j] = data[i];
            });
            text = text.join("");
            return text;
        }
    }
}