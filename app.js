var express = require('express');
var routes = require('./routes');
var routeRss = require('./routes/rss');
var http = require('http');
var path = require('path');
var MongoStore = require('connect-mongo')(express);
var settings = require('./config/settings');
var github_config = require('./config/github');
var flash = require('connect-flash');
var ejs = require('ejs');
var log4js = require('log4js');
log4js.configure(require('./config/log4js.json'));
var logger = log4js.getLogger('data');
logger.setLevel('ERROR');
var app = express();
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var Db = require('./models/db');
var mongodb = Db();
global.mongo = undefined;
mongodb.open(function (err, db) {
    db.authenticate(settings.username,settings.password ,function(){
        mongo = db;
    });
});

app.disable('x-powered-by');
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.html',ejs.__express);
app.set('view engine', 'html');
app.use(flash());
app.use(express.favicon(path.join(__dirname,'/public/favicon.ico')));
app.use(express.bodyParser({keepExtendsions: true,uploadeDir: './public/images'}));
app.use(express.compress());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({
    secret: settings.cookieSecret,
    key: settings.db,
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},
    store: new MongoStore({
        db: settings.db,
        collection: settings.sessionCollection,
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password: settings.password,
        auto_reconnect: true,
        stringify: true
    })
}));
app.use(passport.initialize());
app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO}));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));
app.use(function (err, req, res, next) {
    var meta = '[' + new Date() + '] ' + req.url + '\n';
    logger.error(meta + err.stack);
    next();
});
passport.use(new GithubStrategy({
    clientID: github_config.clientId,
    clientSecret: github_config.clientSecret,
    callbackURL: settings.protocol + "://" + settings.domain + github_config.callbackURL
}, function(accessToken, refreshToken, profile, done) {
    done(null, profile);
}));
// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
app.use(function (req, res) {
    res.render("404");
});

app.get('/', routes.index);
app.get('/post', routes.checkLogin);
app.get('/post',routes.post);
app.get('/logout', routes.checkLogin);
app.get('/logout',routes.logout);
app.get('/upload',routes.checkLogin);
app.get('/upload',routes.upload);
app.get('/archive',routes.archive);
app.get('/arc/:month',routes.searchMonthArticle);
app.get('/tags', routes.tags);
app.get('/tags/:tag', routes.oneTag);
app.get('/search', routes.search);
app.get('/links',routes.links);
app.get('/u/:name',routes.searchUser);
app.get('/p/:_id',routes.searchArticle);
app.get('/edit/:_id', routes.checkLogin);
app.get('/edit/:_id', routes.editActicle);
app.get('/remove/:_id',routes.checkLogin);
app.get('/remove/:_id',routes.removeActicle);
app.get('/series', routes.allseries);
app.get('/series/:_id',routes.oneSeries);
app.get('/newSeries', routes.checkLogin);
app.get('/newSeries', routes.newSeries);
app.get('/staticHTML', routes.static);
app.get('/mksitemap', routes.sitemap);
app.get('/tagsAsync',routes.getTagsAsync);
app.get('/tools',routes.tools);
app.get('/login/github', routes.githubAuth);
app.get('/login/github/callback', routes.githubLoginCallback);
app.get('/rss', routeRss.index);

app.post('/doLogin', routes.checkNotLogin);
app.post('/doLogin',routes.doLogin);
app.post('/doReg',routes.checkNotLogin);
app.post('/doReg',routes.doReg);
app.post('/doPost', routes.checkLogin);
app.post('/doPost',routes.doPost);
app.post('/doUpload',routes.checkLogin);
app.post('/doUpload',routes.doUpload);
app.post('/saveSeries', routes.checkLogin);
app.post('/saveSeries', routes.saveSeries);
app.post('/edit/:_id',routes.checkLogin);
app.post('/edit/:_id',routes.updateActicle);
app.post('/u/:name/:day/:title',routes.checkLogin);
app.post('/u/:name/:day/:title',routes.addComment);
app.post('/postNoLogin',routes.postNoLogin);


http.createServer(app).listen(app.get('port'), function(){
  console.log('服务启动，监听端口' + app.get('port'));
});


/**
 * 未捕获的异常
 */
process.on('uncaughtException', function (err) {
    logger.error(err.stack);
});