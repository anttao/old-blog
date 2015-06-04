var ObjectID = require('mongodb').ObjectID;
var markdown = require('markdown').markdown;

function Post(name, head, title, tags, post ,category) {
    this.name = name;
    this.head = head;
    this.title = title;
    this.category = category;
    this.tags = tags;
    this.post = post;
}

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
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
    //要存入数据库的文档
    var post = {
        name: this.name,
        head: this.head,
        time: time,
        title: this.title,
        category: this.category,
        tags: this.tags,
        post: this.post,
        comments: [],
        pv: 0
    };
    //读取 posts 集合
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //将文档插入 posts 集合
        collection.insert(post, {
            safe: true
        }, function (err) {
            if (err) {
                return callback(err);//失败！返回 err
            }
            callback(null);//返回 err 为 null
        });
    });
};

//读取文章及其相关信息
Post.getTen = function(name, page, pageSize, callback) {
    //读取 posts 集合
    mongo.collection('posts', function(err, collection) {
        if (err) {
            return callback(err);
        }
        var query = {};
        if (name) {
            query.name = name;
        }
        ////使用 count 返回特定查询的文档数 total
        collection.count(query, function (err, total) {
        //根据 query 对象查询文章
            collection.find(query,{
                skip: (page - 1) * pageSize,
                limit: pageSize
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                    if (err) {
                        return callback(err);//失败！返回 err
                    }
                    var size = docs.length;
                    for(var j=0; j< size; j++){
                        var articText = docs[j].post;
                        if(!articText){
                            articText = "";
                            break;
                        }
                        articText = articText.replace(/<(?!br).*?>/g,''); //去除HTML tag
                        articText.value = articText.replace(/[ | ]*\n/g,'\n'); //去除行尾空白
                        articText.value = articText.replace(/&nbsp;/g,'');
                        var len = articText.length;
                        var strdel= articText.substring(0,len);
                        var t = 0;
                        for(var i=0;i<200;i++)
                        {
                            if(strdel.substr(i,1).match("[\u4e00-\u9fa5]"))
                                t=t+2;//alert("汉字");
                            else
                                t=t+1;//alert("英文");
                            if(t>200)
                                break;
                        }
                        var ss=strdel.substring(0,t);
                        if(len > 200){
                            docs[j].post = ss + "......";
                        }else {
                            docs[j].post = ss ;
                        }
                        //docs[j].post = docs[j].post.replace(/<\/?pre[^>]*>/g,''); //去除pre标签
                    }
                    callback(null, docs, total);//成功！以数组形式返回查询的结果
                });
            });
    });
};

/**
 * 返回最新指定limit数的文章
 * @param limit
 * @param callback
 */
Post.getTopByLimit = function(limit, callback){
    mongo.collection('posts', function(err, collection) {
        if (err) {
            return callback(err);
        }
        collection.find({},{
            limit: limit
        }).sort({
                time: -1
            }).toArray(function (err, docs) {
                if (err) {
                    return callback(err);//失败！返回 err
                }
                callback(null, docs);
            });
    });
}

//读取文章及其相关信息
Post.getDayTen = function(name, day,  page, callback) {
    //读取 posts 集合
    mongo.collection('posts', function(err, collection) {
        if (err) {
            return callback(err);
        }
        ////使用 count 返回特定查询的文档数 total
        collection.count({
            name: name,
            "time.day": day
        }, function (err, total) {
            //根据 query 对象查询文章
            collection.find({
                name: name,
                "time.day": day
            },{
                skip: (page - 1)*10,
                limit: 10
            }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    if (err) {
                        return callback(err);//失败！返回 err
                    }
                    callback(null, docs, total);//成功！以数组形式返回查询的结果
                });
        });
    });
};

//读取文章及其相关信息
Post.getMonthTen = function(month, page, callback) {
    //读取 posts 集合
    mongo.collection('posts', function(err, collection) {
        if (err) {
            return callback(err);
        }
        ////使用 count 返回特定查询的文档数 total
        collection.count({
            "time.month": month
        }, function (err, total) {
            //根据 query 对象查询文章
            collection.find({
                "time.month": month
            },{
                skip: (page - 1)*10,
                limit: 10
            }).sort({
                    time: -1
                }).toArray(function (err, docs) {
                    if (err) {
                        return callback(err);//失败！返回 err
                    }
                    callback(null, docs, total);//成功！以数组形式返回查询的结果
                });
        });
    });
};

//获取一篇文章
Post.getOne = function(_id, callback){
    mongo.collection('posts', function(err, collection){
        if(err){
            console.log(err.message);
            return callback(err);
        }
        //根据用户名、发表日期及文章名进行查询
        collection.findOne({
            "_id": new ObjectID(_id)
        },function(err, doc){
            if(err){
                console.log(err.message);
                return callback(err);
            }
            if(doc){
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
                    callback(null, doc);//返回查询的一篇文章
                });
            }
        });
    });
};

//返回原始发表的内容（markdown 格式）
Post.edit = function(_id, callback) {
    //读取 posts 集合
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //根据用户名、发表日期及文章名进行查询
        collection.findOne({
            "_id": new ObjectID(_id)
        }, function (err, doc) {
            if (err) {
                return callback(err);
            }
            callback(null, doc);//返回查询的一篇文章（markdown 格式）
        });
    });
};

//更新一篇文章及其相关信息
Post.update = function(_id, post, callback) {
    //读取 posts 集合
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //更新文章内容
        collection.update({
            "_id": new ObjectID(_id)
        }, {
            $set: {post: post}
        }, function (err) {
            if (err) {
                return callback(err);
            }
            callback(null);
        });
    });
};

//删除一篇文章
Post.remove = function(id, callback) {
    //读取 posts 集合
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //根据用户名、日期和标题查找并删除一篇文章
        collection.remove({
            "_id": new ObjectID(id)
        }, function (err,result) {
            if (err) {
                return callback(err);
            }
            callback(null);
        });
    });
};

//返回所有文章存档信息
Post.getArchive = function(callback) {
    //读取 posts 集合
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //返回只包含 name、time、title 属性的文档组成的存档数组
        collection.find({}, {
            "name": 1,
            "time": 1,
            "title": 1
        }).sort({
                time: -1
            }).toArray(function (err, docs) {
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
    });
};

Post.getAll = function(callback){
  //读取 posts 集合
  mongo.collection('posts', function (err, collection) {
    if (err) {
      return callback(err);
    }
    //返回只包含 name、time、title 属性的文档组成的存档数组
    collection.find({}, {}).sort({
        time: -1
      }).toArray(function (err, docs) {
        if (err) {
          return callback(err);
        }
        callback(null, docs);
      });
  });
};

//返回所有标签
Post.getTags = function(callback) {
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //distinct 用来找出给定键的所有不同值
        collection.distinct("tags", function (err, docs) {
            if (err) {
                return callback(err);
            }
            docs.shift();//删除第一个元素
            callback(null, docs);
        });
    });
};

/**
 * 获取所有的类别
 * @param callback
 */
Post.getCategorys = function(callback){
    mongo.collection('posts',function(err, collection){
        if(err){
            return callback(err);
        }
        collection.distinct(function(err, categorys){
            if(err){
                return callback(err);
            }
            callback(null, categorys);
        });
    });
};

//返回含有特定标签的所有文章
Post.getTag = function(tag, callback) {
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        //查询所有 tags 数组内包含 tag 的文档
        //并返回只含有 name、time、title 组成的数组
        collection.find({
            "tags": tag
        }, {
            "name": 1,
            "time": 1,
            "title": 1
        }).sort({
                time: -1
            }).toArray(function (err, docs) {
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
    });
};

//返回通过标题关键字查询的所有文章信息
Post.search = function(keyword, callback) {
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        var pattern = new RegExp("^.*" + keyword + ".*$", "igm");
        collection.find({
            //$or:[
            //    {title: pattern},
            //    {post: pattern}
            //]
            title: pattern
        }, {
            "name": 1,
            "time": 1,
            "title": 1
        }).sort({
                time: -1
            }).toArray(function (err, docs) {
                if (err) {
                    return callback(err);
                }
                //console.log(docs);
                callback(null, docs);
            });
    });
};

//返回当天的所有文章信息
Post.searchToday = function(callback) {
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        var date = new Date();
        //存储各种时间格式，方便以后扩展
        var time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        collection.find({
            "time.day": time
        }, {
            "name": 1,
            "time": 1,
            "title": 1
        }).sort({
                time: -1
            }).toArray(function (err, docs) {
                if (err) {
                    return callback(err);
                }
                //console.log(docs);
                callback(null, docs);
            });
    });
};

/**
 *热门热门文章
 * @param callback
 */
Post.topHotArticle = function(callback){
    mongo.collection('posts', function (err, collection) {
        if (err) {
            return callback(err);
        }
        collection.find({}, {
            "title": 1,
            "pv":1
        }).sort({
                pv: -1
            }).limit(15).toArray(function (err, docs) {
                if (err) {
                    return callback(err);
                }
                //console.log(docs);
                callback(null, docs);
            });
    });
}

module.exports = Post;