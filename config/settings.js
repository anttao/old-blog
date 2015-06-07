module.exports = {
    "cookieSecret" : 'myweibo',
    "db" : 'blog',
    "port" : 27017,
    "host" : 'localhost',
    "username" : 'xxxx',
    "password" : 'xxxx',
    "sessionCollection" : "sessions",
    "domain" : "blog.gaoqixhb.com",
    "protocol" : "http",
    // RSS配置
    rss: {
        title: '关注前后端技术 - 搞起博客 gaoqixhb.com',
        link: 'http://blog.gaoqixhb.com',
        language: 'zh-cn',
        description: '搞起博客是分享、讨论、交流前后端技术或者个人体会、经验的博客平台。',
        //最多获取的RSS Item数量
        max_rss_items: 30
    }
};
