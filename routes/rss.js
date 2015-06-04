var settings = require('../config/settings');
var convert = require('data2xml')();
var Post = require('../models/post.js');
var cache = require('../common/cache');

/**
 * rss输出
 * @param req
 * @param res
 */
exports.index = function(req, res){
    if (!settings.rss) {
        res.statusCode = 404;
        return res.send('Please set `rss` in configuration');
    }
    res.contentType('application/xml');
    cache.get('rss', function(err, rss){
        if(rss){
            res.send(rss);
        }else{
            Post.getTopByLimit(settings.rss.max_rss_items, function (err, posts) {
                if(err){
                    res.statusCode = 500;
                    return res.send(' rss error');
                }
                var rss_obj = {
                    _attr: { version: '2.0' },
                    channel: {
                        title: settings.rss.title,
                        link: settings.rss.link,
                        language: settings.rss.language,
                        description: settings.rss.description,
                        item: []
                    }
                };
                posts.forEach(function (post) {
                    rss_obj.channel.item.push({
                        title: post.title,
                        link: settings.rss.link + '/topic/' + post._id,
                        guid: settings.rss.link + '/topic/' + post._id,
                        description: post.post,
                        author: post.name,
                        pubDate: post.time.date.toUTCString()
                    });
                });
                var rssContent = convert('rss', rss_obj);
                cache.set('rss', rssContent, 1000 * 60 * 5); // 五分钟
                res.send(rssContent);
            });
        }
    });
}