var crypto = require('crypto'),
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js'),
    Series = require('../models/series.js'),
    fs = require('fs'),
    http = require('http'),
    async = require('async'),
    passport = require('passport'),
    util = require('util');
var qiniu = require('qiniu');
var qiniu_config = require('../config/qiniu.js');


/**
 * 首页
 * @param req
 * @param res
 */
exports.index = function(req, res){
    var page = req.query.p ? parseInt(req.query.p) : 1;
    var totalArticle = 0;
    async.parallel({
        posts : function(callback){
            Post.getTen(null, page, 15, function (err, posts, total) {
                totalArticle = total;
                for(var i = 0, len = posts.length; i < len; i++){
                    posts[i].time = hommizationTime(posts[i].time.date.getTime());
                }
                callback(null, posts);
            });
        },
        tags : function(callback){
            Post.getTags(function(err, tags){
                callback(null, tags);
            });
        },
        list : function(callback){
            Post.getArchive(function (err, archives) {
                if (err) {
                    return res.redirect('/');
                }
                var lastYear = 0;
                var list = {
                    year: [],
                    month: []
                };
                archives.forEach(function (post, index) {
                    if (lastYear != post.time.year) {
                        list.year.push(post.time.year);
                        lastYear = post.time.year
                    }
                    if(list.month.length == 0){
                        list.month.push({name:post.name, year:post.time.year, month: post.time.month, count: 1});
                    }else{
                        var exsist = false;
                        list.month.forEach(function(d, index){
                            if(d.month == post.time.month){
                                d.count +=1;
                                exsist = true;
                            }
                        });
                        if(!exsist){
                            list.month.push({name:post.name, year:post.time.year, month: post.time.month, count: 1});
                        }
                    }
                });
                callback(null, list);
            });
        },
        hots : function(callback){
            Post.topHotArticle(function(err, hots){
                callback(null, hots);
            });
        }
    },function(err, results){
        res.render('index', {
            title: '关注前后端技术',
            user: req.session.user,
            posts: results.posts,
            tags: results.tags,
            archive: results.list,
            page: page,
            hots: results.hots,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page - 1) * 10 + results.posts.length) == totalArticle,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 登录请求
 * @param req
 * @param res
 */
exports.doLogin = function(req, res){
    //生成密码的 md5 值
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    //检查用户是否存在
    User.get(req.body.name, function (err, user) {
        if (!user) {
            req.flash('error', '用户不存在!');
            return res.redirect('/login');//用户不存在则跳转到登录页
        }
        //检查密码是否一致
        if (user.password != password) {
            req.flash('error', '密码错误!');
            return res.redirect('/login');//密码错误则跳转到登录页
        }
        //用户名密码都匹配后，将用户信息存入 session
        req.session.user = user;
        req.flash('success', '登陆成功!');
        res.redirect('/');//登陆成功后跳转到主页
    });
};

/**
 * 注册请求
 * @param req
 * @param res
 * @returns {*}
 */
exports.doReg = function(req, res){
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    //检验用户两次输入的密码是否一致
    if (password_re != password) {
        req.flash('error', '两次输入的密码不一致!');
        return res.redirect('/reg');//返回注册页
    }
    //生成密码的 md5 值
    var md5 = crypto.createHash('md5'),
        passwd = md5.update(req.body.password).digest('hex');
    var newUser = new User({
        name: req.body.name,
        password: passwd,
        email: req.body.email
    });
    //检查用户名是否已经存在
    User.get(newUser.name, function (err, user) {
        if (user) {
            req.flash('error', '用户已存在!');
            return res.redirect('/reg');//返回注册页
        }
        //如果不存在则新增用户
        newUser.save(function (err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/reg');//注册失败返回主册页
            }
            req.session.user = user;//用户信息存入 session
            req.flash('success', '注册成功!');
            res.redirect('/');//注册成功后返回主页
        });
    });
};

/**
 * 跳转发表文章页面
 * @param req
 * @param res
 */
exports.post = function(req, res){
    res.render('post', {
        title: '发表',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
};

/**
 * 发表文章
 * @param req
 * @param res
 */
exports.doPost = function(req, res){
    var currentUser = req.session.user,
         tags = [req.body.tag1, req.body.tag2, req.body.tag3],
        post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
    if(req.body.title == '' || tags[0] == '' || req.body.post == ''){
        return res.redirect('back');
    }
    post.save(function (err) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        req.flash('success', '发布成功!');
        res.redirect('/');//发表成功跳转到主页
    });
};

/**
 * 跳转上传页面
 * @param req
 * @param res
 */
exports.upload = function(req, res){
    res.render('upload',{
        title: 'File upload',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
};

/**
 * 上传请求
 * @param req
 * @param res
 */
exports.doUpload = function(req, res){
	//console.log(req.files);
    if(req.files['imgFile'].size == 0){
        //使用同步方式删除一个文件
        fs.unlinkSync(req.files[i].path);
        console.log(' Successsfully removed an empty file!');
    } else {
        var target_path = './public/upload/' + req.files['imgFile'].name;
//        console.log(target_path);
        //使用同步方式重命名一个文件
        var readStream = fs.createReadStream(req.files['imgFile'].path);
        var writeStream = fs.createWriteStream(target_path);
        readStream.pipe(writeStream, function(){
            fs.unlinkSync(req.files[i].path);
        });
        qiniu.conf.ACCESS_KEY = qiniu_config.AK;
        qiniu.conf.SECRET_KEY = qiniu_config.SK;
        var uptoken = new qiniu.rs.PutPolicy(qiniu_config.bucket).token();
        var extra = new qiniu.io.PutExtra();
        fs.readFile(target_path, function(err, data){
            qiniu.io.put(uptoken, 'img/' + req.files['imgFile'].name, data, extra, function(err, ret) {
                if(!err) {
                    // 上传成功， 处理返回值
                    res.write(JSON.stringify({
                        "error" : 0,
                        "url" : qiniu_config.domain + ret.key
                    }));
                    console.log("上传成功！");
                } else {
                    // 上传失败， 处理返回代码
                    // http://developer.qiniu.com/docs/v6/api/reference/codes.html
                    res.write(JSON.stringify({
                        "error" : 1,
                        "message" : "上传失败"
                    }));
                    console.log("上传失败！");
                }
                req.flash('success','文件上传成功！');
                res.end();
                fs.unlinkSync(target_path);
            });
        });
    }
};

/**
 * 查询用户是否存在并返回用户文章的分页
 * @param req
 * @param res
 */
exports.searchUser = function(req, res){
    var page = req.query.p ? parseInt(req.query.p) : 1;
    //检查用户是否存在
    User.get(req.params.name, function (err, user) {
        if (!user) {
            req.flash('error', '用户不存在!');
            return res.redirect('/');//用户不存在则跳转到主页
        }
        //查询并返回该用户的所有文章
        Post.getTen(user.name, page, 10, function (err, posts, total) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('user', {
                title: user.name,
                posts: posts,
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 10 + posts.length) == total,
                user : req.session.user,
                success : req.flash('success').toString(),
                error : req.flash('error').toString()
            });
        });
    });
};

/**
 * 搜索一篇文章
 * @param req
 * @param res
 */
exports.searchArticle = function(req,res){
    async.parallel({
        post: function(callback){
            Post.getOne(req.params._id, function(err, post){
                if(err){
                    req.flash(err);
                    return res.redirect('/');
                }
                callback(null, post);
            });
        },
        posts : function(callback){
            Post.getTen(null, 1, 15, function(err, posts, total){
                callback(null, posts);
            });
        },
        hots : function(callback){
            Post.topHotArticle(function(err, hots){
                callback(null, hots);
            });
        }
    },function(err, results){
        var articText = results.post.post;
        articText = articText.replace(/<\/?[^>]*>/g,''); //去除HTML tag
        articText = articText.replace(/[ | ]*\n/g,'\n'); //去除行尾空白
        articText = articText.replace(/[ ]/g,"")
        var t = 0;
        for(var i=0;i<400;i++)
        {
            if(articText.substr(i,1).match("[\u4e00-\u9fa5]"))
                t=t+2;//汉字;
            else
                t=t+1;//英文;
            if(t>200)
                break;
        }
        var desc = articText.substring(0,t);
        var keys = "java,android,安卓,C++,js,Node.js,javascript,mongodb,redis,jquery,nosql,算法";
        var len = (results.post.tags == undefined) ? 0 : results.post.tags.length;
        for(var i = 0; i < len; i++){
            if(i == 0){
                keys = results.post.tags[i];
            }else{
                if(results.post.tags[i] == ""){
                    continue;
                }
                keys += "," + results.post.tags[i];
            }
        }
        results.post.post += "<br/><br/><br/><center>(转载请注明作者和出处 <a href='http://blog.gaoqixhb.com'>搞起博客 blog.gaoqixhb.com </a>，请勿用于商业用途)</center>";
        res.render('acticle', {
            title: results.post.title,
            post: results.post,
            hots: results.hots,
            desc: desc,
            keys: keys,
            recent: results.posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 搜索某天的文章
 * @param req
 * @param res
 */
exports.searchDayArticle = function(req, res){
    var page = req.query.p ? parseInt(req.query.p) : 1;
    //检查用户是否存在
    User.get(req.params.name, function (err, user) {
        if (!user) {
            req.flash('error', '用户不存在!');
            return res.redirect('/');//用户不存在则跳转到主页
        }
        //查询并返回该用户的所有文章
        Post.getDayTen(user.name, req.params.day, page, function (err, posts, total) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            console.log("total:"+total);
            res.render('acticle_day', {
                title: user.name,
                posts: posts,
                page: page,
                isFirstPage: (page - 1) == 0,
                isLastPage: ((page - 1) * 10 + posts.length) == total,
                user : req.session.user,
                success : req.flash('success').toString(),
                error : req.flash('error').toString()
            });
        });
    });
};

/**
 * 搜索某月文章列表
 * @param req
 * @param res
 */
exports.searchMonthArticle = function(req, res){
    var page = req.query.p ? parseInt(req.query.p) : 1;
    //查询并返回该用户的所有文章
    Post.getMonthTen( req.params.month, page, function (err, posts, total) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        console.log("total:"+total);
        res.render('acticle_month', {
            title: req.params.month + "的文章",
            posts: posts,
            page: page,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page - 1) * 10 + posts.length) == total,
            user : req.session.user,
            success : req.flash('success').toString(),
            error : req.flash('error').toString()
        });
    });
};


/**
 * 编辑文章
 * @param req
 * @param res
 */
exports.editActicle = function(req, res){
    Post.edit( req.params._id, function(err, post){
        if(err){
            req.flash('error',err);
            return res.redirect('back');
        }
        res.render('edit', {
            title: '编辑',
            post: post,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });

    });
};


/**
 * 修改文章
 * @param req
 * @param res
 */
exports.updateActicle = function(req, res){
    Post.update(req.params._id, req.body.post, function (err) {
        var url = '/p/' + req.params._id;
        if (err) {
            req.flash('error', err);
            return res.redirect(url);//出错！返回文章页
        }
        req.flash('success', '修改成功!');
        res.redirect(url);//成功！返回文章页
    });
};


/**
 * 删除文章
 * @param req
 * @param res
 */
exports.removeActicle = function(req, res){
    Post.remove( req.params._id, function (err) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back');
        }
        req.flash('success', '删除成功!');
        res.redirect('/');
    });
};


/**
 * 添加留言
 * @param req
 * @param res
 */
exports.addComment = function(req,res){
    var date = new Date(),
        time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
    var md5 = crypto.createHash('md5'),
        email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
        head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
    var comment = {
        name: req.body.name,
        head: head,
        email: req.body.email,
        website: req.body.website,
        time: time,
        content: req.body.content
    };
    var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
    newComment.save(function (err) {
        if (err) {
            req.flash('error', err);
            return res.redirect('back');
        }
        req.flash('success', '留言成功!');
        res.redirect('back');
    });
};

/**
 * 存档页面
 * @param req
 * @param res
 */
exports.archive = function(req, res){
    Post.getArchive(function (err, posts) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('archive', {
            title: '存档',
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 标签页面
 * @param req
 * @param res
 */
exports.tags = function(req, res){
    Post.getTags(function (err, posts) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('tags', {
            title: '标签',
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 异步获取tags
 * @param req
 * @param res
 */
exports.getTagsAsync = function(req, res){
    Post.getTags(function(err, posts){
        if(err){
            req.flash('error',err);
            res.end('');
        }
        res.write(JSON.stringify(posts));
        res.end();
    });
};

/**
 * 查询含有标签的所有文章
 * @param req
 * @param res
 */
exports.oneTag = function(req, res){
    Post.getTag(req.params.tag, function (err, posts) {
        if (err) {
            req.flash('error',err);
            return res.redirect('/');
        }
        res.render('tag', {
            title: req.params.tag + "相关文章列表",
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};


/**
 * 搜索文章
 * @param req
 * @param res
 */
exports.search = function(req, res){
    Post.search(req.query.keyword, function (err, posts) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        res.render('search', {
            title: req.query.keyword + "相关文章",
            posts: posts,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 搜索系列分页
 * @param req
 * @param res
 */
exports.allseries = function(req, res){
    var page = req.query.p ? parseInt(req.query.p) : 1;
    var totalResult = 0;
    async.parallel({
        series : function(callback){
            Series.getPage(req.query.name, page, function(err, series, total){
                totalResult = total;
                callback(null, series);
            });
        }
        //热门系列

        //最新系列

        //热门文章
    }, function(err, results){
        res.render('allseries', {
            title: "系列文章",
            series: results.series,
            page: page,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page - 1) * 10 + results.series.length) == totalResult,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 跳转到添加系列
 * @param req
 * @param res
 */
exports.newSeries = function(req, res){
    res.render('addseries',{
        title: '添加文章系列',
        user: req.session.user
    });
};

/**
 * 保存新系列
 * @param req
 * @param res
 */
exports.saveSeries = function(req, res){
    var currentUser = req.session.user,
        posts = new Array();
    for(var i= 0, len = req.body.pName.length; i < len; i++){
        posts.push({name: req.body.pName[i], id : req.body.pId[i]});
    }
    var series = new Series(req.body.seriesName, req.body.seriesDesc, "", posts , currentUser.name);
    series.save(function(err){
        if (err) {
            req.flash('error', err);
            return res.redirect('/series');
        }
        res.redirect('/series');//发表成功跳转到系列主页
    });

};

/**
 * 根据系列id搜索一个系列
 * @param req
 * @param res
 */
exports.oneSeries = function(req, res){
    Series.getOne(req.params._id, function(err, series){
        if(err){
            res.redirect('/');
        }
        res.render('oneseries',{
            title: series.name + "的文章",
            series: series,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
};

/**
 * 静态化所有文章
 * @param req
 * @param res
 */
exports.static = function(req, res){
    Post.search('', function(err, posts){
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
		fs.exists('public/article',function(exists){
			if(!exists){
				console.log('创建目录');
				fs.mkdir('public/article',null);
			}
		});
        posts.forEach(function(post, index){
            console.log("come in "+post._id);
            var options = {
                hostname: 'localhost',
                port: 3000,
                path: '/p/'+post._id,
                method: 'GET'
            };
            var req = http.request(options , function(res){
                console.log("响应：" + res.statusCode);
                res.setEncoding('utf8');
                res.on('data', function(chunk){
                    if(res.statusCode != 200){
                        return;
                    }
					fs.writeFile('public/article/'+post._id + '.html', chunk, function(err){
						if(err) throw err;
						console.log('has finished');
					});
                });
            });
            req.on('error', function(e){
                console.log('problem with request: ' + e.message);
            });
            req.end();
        });
    });
    res.redirect('/');
};

/**
 * 生成sitemap.xml
 * @param req
 * @param res
 */
exports.sitemap = function(req, res){
    Post.search('', function(err, posts){
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        var content = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">';
        var date = new Date();
        content += "<url><loc>http://blog.gaoqixhb.com</loc><lastmod>" +
            date.getFullYear() + "-" + ((date.getMonth() + 1) < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1) ) + "-" + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()) +
            "</lastmod><changefreq>always</changefreq><priority>1.0</priority></url>";
        posts.forEach(function(post, index){
            content += '<url>';
            content += '<loc>http://blog.gaoqixhb.com/p/' + post._id + '</loc>';

            content += '<lastmod>';
            var t = post.time.day.split('-');
            content += t[0]+'-'+ (parseInt(t[1]) < 10 ? '0'+t[1] : t[1]) + '-' + (parseInt(t[2]) < 10 ? '0'+t[2] : t[2]);
            content += '</lastmod>';
            content += '<changefreq>daily</changefreq><priority>1.0</priority>';
            content += '</url>';
        });
        content += '</urlset>';
        fs.writeFile('public/sitemap.xml', content, function(err){
            if(err) throw err;
            console.log('sitemap has been made');
        });
    });
    res.redirect('/');
};

/**
 * 友情链接
 * @param req
 * @param res
 */
exports.links = function(req, res){
    res.render('links', {
        title: '友情链接',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
};

/**
 * 工具页
 * @param req
 * @param res
 */
exports.tools = function(req, res){
    res.render('tools',{
        title: '开发常用工具',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
};

exports.githubAuth = function(req, res){
    passport.authenticate("github", {session: false})
};

exports.githubLoginCallback = function(req, res){
    passport.authenticate("github", {
        session: false,
        failureRedirect: '/',
        successFlash: '登陆成功！'
    }), function (req, res) {
        req.session.user = {name: req.user.username, head: "https://gravatar.com/avatar/" + req.user._json.gravatar_id + "?s=48"};
        res.redirect('/');
    }
};

/**
 * 登出
 * @param req
 * @param res
 */
exports.logout = function(req, res){
    req.session.user = null;
    req.flash('success', '登出成功!');
    res.redirect('/');//登出成功后跳转到主页
};

/**
 * 无登陆发文
 * @param req
 * @param res
 */
exports.postNoLogin = function(req, res){
    var tags = [req.body.tag1, req.body.tag2, req.body.tag3],
        post = new Post("luoyjx", "", req.body.title, tags, req.body.post);
    post.save(function (err) {
        if (err) {
            req.flash('error', err);
            return res.redirect('/');
        }
        req.flash('success', '发布成功!');
        res.redirect('/');//发表成功跳转到主页
    });
}

/**
 * 检查是否登录
 * @param req
 * @param res
 * @param next
 */
exports.checkLogin = function checkLogin(req, res, next) {
    if (!req.session.user) {
        console.log("未登录");
        req.flash('error', '未登录!');
        res.redirect('/');
    }
    next();
};

/**
 * 检查是否已登录
 * @param req
 * @param res
 * @param next
 */
exports.checkNotLogin = function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        res.redirect('back');//返回之前的页面
    }
    next();
};

/**
 * 根据时间戳获取人性化时间
 * @param dateTimeStamp 时间戳
 * @returns {*}
 */
function hommizationTime(dateTimeStamp){
    var result;
    var minute = 1000 * 60;
    var hour = minute * 60;
    var day = hour * 24;
    var month = day * 30;
    var now = new Date().getTime();
    var diffValue = now - dateTimeStamp;
    if(diffValue < 0){
    }
    var monthC =diffValue/month;
    var weekC =diffValue/(7*day);
    var dayC =diffValue/day;
    var hourC =diffValue/hour;
    var minC =diffValue/minute;

    if(monthC>=1){
        result="" + parseInt(monthC) + "月前";
    }
    else if(weekC>=1){
        result="" + parseInt(weekC) + "星期前";
    }
    else if(dayC>=1){
        result=""+ parseInt(dayC) +"天前";
    }
    else if(hourC>=1){
        result=""+ parseInt(hourC) +"小时前";
    }
    else if(minC>=1){
        result=""+ parseInt(minC) +"分钟前";
    }else
        result="刚刚";
    return result;
}