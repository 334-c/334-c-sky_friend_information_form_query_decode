console.log("服务器启动中...");
const startDate = Date.now();
const utils = require("./utils");
// 初始化
utils.init();
// 引入外部模块
let server = require("http").createServer(utils.app).listen(utils.config.port, function(err) {
    if(err) utils.logger.error("服务器启动失败", err);
    else utils.logger.info(`服务器启动成功,端口为${utils.config.port},启动耗时:${Date.now() - startDate}ms, http://localhost:${utils.config.port}/`);
});
// 超时5分钟
server.setTimeout(5 * 60 * 1000);