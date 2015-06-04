var ObjectID = require('mongodb').ObjectID;

/**
 * 系列实体
 * @param name
 * @param desc
 * @param category
 * @param posts
 * @param author   作者
 * @constructor
 */
function Series(name, desc, category, posts, author){
    this.name = name;
    this.desc = desc;
    this.category = category;
    this.posts = posts;
    this.author = author;
}

module.exports = Series;

/**
 * 添加系列
 * @param callback
 */
Series.prototype.save = function(callback){
    var date = new Date();
    //存储各种时间格式，方便以后扩展
    var time = {
        date: date,
        year : date.getFullYear(),
        month : date.getFullYear() + "-" + (date.getMonth() + 1),
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };

    var series = {
        name: this.name,
        desc: this.desc,
        category: this.category,
        posts: this.posts,
        pv: 0,
        author: this.author,
        createtime: time,
        edittime: time
    };
        mongo.collection('series', function(err, collection){
            if (err) {
                return callback(err);
            }
            collection.insert(series, {
                safe: true
            }, function (err) {
                if (err) {
                    return callback(err);//失败！返回 err
                }
                callback(null);//返回 err 为 null
            });
        });
};

/**
 * 查询系列分页
 * @param name
 * @param page
 * @param callback
 */
Series.getPage = function(name, page, callback){

        mongo.collection('series', function(err, collection){
            if(err){
                return callback(err);
            }
            var query = {};
            if(name){
                query.name = name;
            }
            collection.count(function(err, total){
                collection.find(query, {
                    skip: (page - 1) * 20,
                    limit: 20
                }).sort({
                    createtime: -1
                }).toArray(function(err, series){
                        //多个系列
                        if(err){
                            return callback(err);
                        }
                        callback(null, series,total);
                    });
            });
        });
};

/**
 * 获取一个系列
 */
Series.getOne = function(_id, callback){

        mongo.collection('series', function(err, collection){
            if(err){
                console.log(err.message);
                return callback(err);
            }
            //根据id进行查询一个系列
            collection.findOne({
                "_id": new ObjectID(_id)
            },function(err, series){
                if(err){
                    console.log(err.message);
                    return callback(err);
                }
                if(series){
                    //每访问 1 次，pv 值增加 1
                    collection.update({
                        "_id": new ObjectID(_id)
                    }, {
                        $inc: { "pv": 1}
                    }, function (err) {
                        if (err) {
                            console.log(err.message);
                            return callback(err);
                        }
                        callback(null, series);//返回查询的一个系列
                    });
                }
            });
        });
};

/**
 * 获取一个系列
 * @param _id
 * @param callback
 */
Series.edit = function(_id, callback){

        //读取 posts 集合
        mongodb.collection('series', function (err, collection) {
            if (err) {
                return callback(err);
            }
            //根据id进行查询
            collection.findOne({
                "_id": new ObjectID(_id)
            }, function (err, seris) {
                if (err) {
                    return callback(err);
                }
                callback(null, seris);
            });
        });
};

/**
 * 更新一个系列
 * @param _id
 * @param series
 * @param callback
 */
Series.update = function(_id, series, callback){
    var date = new Date();
    //存储各种时间格式，方便以后扩展
    var time = {
        date: date,
        year : date.getFullYear(),
        month : date.getFullYear() + "-" + (date.getMonth() + 1),
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    };

        //读取 posts 集合
        mongo.collection('series', function (err, collection) {
            if (err) {
                return callback(err);
            }
            //更新文章内容
            collection.update({
                "_id": new ObjectID(_id)
            }, {
                $set: {
                    name: series.name,
                    desc: series.desc,
                    category: series.category,
                    posts: series.posts,
                    edittime: time
                }
            }, function (err) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
};

/**
 * 删除一个系列
 * @param _id
 * @param callback
 */
Series.remove = function(_id, callback){

        //读取 posts 集合
        mongodb.collection('series', function (err, collection) {
            if (err) {
                return callback(err);
            }
            //根据用户名、日期和标题查找并删除一篇文章
            collection.remove({
                "_id": new ObjectID(_id)
            }, function (err,result) {
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
};



