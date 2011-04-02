function __hex (hexdata) {
    var data = hexdata.replace (/([a-f0-9]){2}/ig, function (x) {
        return String.fromCharCode (parseInt (x, 16))
    })

    return data
}

function connectionDidFailWithError (connid, err) {
    var e = document.createElement ("p")
    e.textContent = "fail: " + err
    document.body.appendChild (e)
}

function connectionDidReceiveData (connid, data) {
    var e = document.createElement ("p")
    e.textContent = "recv: " + data.length
    document.body.appendChild (e)
}

function connectionDidReceiveResponse (connid) {
    var e = document.createElement ("p")
    e.textContent = "recv response"
    document.body.appendChild (e)
}

function connectionDidSendBodyData (connid) {
    var e = document.createElement ("p")
    e.textContent = "data sent"
    document.body.appendChild (e)
}

function connectionDidFinishLoading (connid) {
    var e = document.createElement ("p")
    e.textContent = "finish"
    document.body.appendChild (e)
}

////////////////////

function create_stack () {
    return []
}

function stack_push_raw_string (st, val) {
    st.push ("-" + val)
}

function stack_push_operator (st, op) {
    st.push ("@" + op)
}

function hexify (str) {
    var hex = ""
    for (var i = 0; i < str.length; i ++) {
        hex += str.charCodeAt (i).toString (16)
    }

    return hex
}

function stack_push_string (st, op) {
    if (typeof (op) != "string")
        op = op.toString ()

    if (op.match (/^[a-zA-Z0-9!@#$%^&*()_+{}|\[\]\:";'<>?,]*$/)) {
        stack_push_raw_string (st, op)
    } else {
        stack_push_raw_string (st, hexify (op))
        stack_push_operator (st, "hexstr")
        stack_push_operator (st, "str")
    }
}

function stack_push_data (st, op) {
    if (typeof (op) != "string")
        op = op.toString ()

    stack_push_raw_string (st, hexify (op))
    stack_push_operator (st, "hexstr")
}

function stack_execute (st) {
    var uri = "bridge:///" + st.join ("/")
    $("pre").append ("\nexecute: " + uri)
    setTimeout (function () {
        location.href = uri
    }, 100)
}

JSBridgeStack = function () {
    this.stack = create_stack ()
}

JSBridgeStack.prototype.push = function () {
    $("pre").append ("push: " + arguments)
    for (var i = 0; i < arguments.length; i ++) {
        stack_push_string (this.stack, arguments[i])
    }
    return this
}

JSBridgeStack.prototype.pushdata = function () {
    $("pre").append ("pushdata: " + arguments)
    for (var i = 0; i < arguments.length; i ++) {
        stack_push_data (this.stack, arguments[i])
    }
    return this
}

JSBridgeStack.prototype.operate = function (op) {
    stack_push_operator (this.stack, op)
    return this
}

JSBridgeStack.prototype.execute = function () {
    stack_execute (this.stack)
}

///////////////////

function init () {
    $(document).ready (function () {
        $("pre").text ("ready")

        var jsb = new JSBridgeStack ()
        jsb.push (123, 456).operate ("add").push ("hoge", 1).operate ("callback").execute ()
    })
}

function hoge (x) {
    $("pre").append ("\n" + x)

    var jsb = new JSBridgeStack ()
    jsb.push ("hoge", "key").operate ("hmac_sha1").operate ("base64data").operate ("print").push ("hoge2", 0).operate ("callback").execute ()
}

function hoge2 () {
    $("pre").append ("\n" + "hoge2")

    var url = "http://scrw.in/"
    var jsb = new JSBridgeStack ()
    jsb.push ("Value1", "X-Scrw-Key1", "Value2", "X-Scrw-Key2", 2, url).operate ("http_post").push ("hoge3", 1).operate ("callback").execute ()
}

function hoge3 (connid) {
    $("pre").append ("\n" + "hoge3: conn ID: " + connid)

    var mesg = '<chat-entry room="opakapaka"><from><user-by-nickname><string>Toru</string></user-by-nickname><avatar-image><string>http://www.gravatar.com/avatar/5efc507a8db7167e2db7889a5597a3cd?s=40&amp;default=identicon</string></avatar-image></from><content><string>konichiwa</string></content></chat-entry>'

    var jsb = new JSBridgeStack ()
    jsb.pushdata (mesg).push ("Value1", "X-Scrw-Key1", "Value2", "X-Scrw-Key2", 2, "http://scrw.in/push.cgi").operate ("http_post").operate ("print").execute ()
}

// init ();

function escape_utf8 (str) {
    // "POST&https%3A%2F%2Fapi.twitter.com%2Foauth%2Frequest_token&oauth_callback%3Dhttp%253A%252F%252Flocalhost%253A3005%252Fthe_dance%252Fprocess_callback%253Fservice_provider_id%253D11%26oauth_consumer_key%3DGDdmIQH6jhtmLUypg82g%26oauth_nonce%3DQP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1272323042%26oauth_version%3D1.0"

    var hex = ""
    for (var i = 0; i < str.length; i ++) {
        var c = str.charAt (i)
        if (c.match (/[a-zA-Z0-9_.-]/)) {
            hex += c
        } else {
            hex += "%" + ("00" + str.charCodeAt (i).toString (16).toUpperCase ()).substr (-2)
        }
    }

    return hex
}

function oauth_make_signature_base (url, method, params) {
    var params_sorted = []
    for (var i in params) {
        params_sorted.push ([i, params[i]])
    }
    params_sorted.sort (function (a, b) {return a > b ? 1 : -1})

    console.debug (params_sorted)

    var body = $.map (params_sorted, function (a) {
        return a[0] + "=" + escape_utf8 (a[1])
    }).join ("&")
    var base = $.map ([method, url, body], escape_utf8).join ("&")

    return base
}

CALLBACK = []
function make_callback (func) {
    CALLBACK.push (func)
    return "CALLBACK[" + (CALLBACK.length - 1).toString () + "]"
}

function test_twitter_oauth () {
    var consumer_secret = "MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98"
    var url = "https://api.twitter.com/oauth/request_token"
    var method = "POST"
    var params = {
        oauth_callback: "http://localhost:3005/the_dance/process_callback?service_provider_id=11",
        oauth_consumer_key: "GDdmIQH6jhtmLUypg82g",
        oauth_nonce: "QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk",
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: "1272323042",
        oauth_version: "1.0"
    }

    var base = oauth_make_signature_base (url, method, params)
    console.assert (base == "POST&https%3A%2F%2Fapi.twitter.com%2Foauth%2Frequest_token&oauth_callback%3Dhttp%253A%252F%252Flocalhost%253A3005%252Fthe_dance%252Fprocess_callback%253Fservice_provider_id%253D11%26oauth_consumer_key%3DGDdmIQH6jhtmLUypg82g%26oauth_nonce%3DQP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1272323042%26oauth_version%3D1.0")

    var cb = make_callback (function (sig) {
        $("pre").append ("\n" + "test_twitter_oauth: signature: " + sig)
        console.assert (sig == "8wUi7m5HFQy76nowoCThusfgB+Q=")

        var x = []
        for (var name in params) {
            var value = params[name]
            x.push (name + "=\"" + escape_utf8 (value) + "\"")
        }
        x.push ("oauth_signature" + "=\"" + escape_utf8 (sig) + "\"")
        var auth = "OAuth " + x.join (", ")
        $("pre").append ("\n" + "auth: " + auth)

        var jsb = new JSBridgeStack ()
        jsb.push (auth).operate ("print").execute ()

        // 'OAuth oauth_callback="http%3A%2F%2Flocalhost%3A3005%2Fthe_dance%2Fprocess_callback%3Fservice_provider_id%3D11", oauth_consumer_key="GDdmIQH6jhtmLUypg82g", oauth_nonce="QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1272323042", oauth_version="1.0", oauth_signature="8wUi7m5HFQy76nowoCThusfgB%2BQ%3D"'
        // 'OAuth oauth_nonce="QP70eNmVz8jvdPevU3oJD2AfF7R7odC2XJcn4XlZJqk", oauth_callback="http%3A%2F%2Flocalhost%3A3005%2Fthe_dance%2Fprocess_callback%3Fservice_provider_id%3D11", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1272323042", oauth_consumer_key="GDdmIQH6jhtmLUypg82g", oauth_signature="8wUi7m5HFQy76nowoCThusfgB%2BQ%3D", oauth_version="1.0"'

    })

    var jsb = new JSBridgeStack ()
    jsb.push (base, consumer_secret + "&").operate ("hmac_sha1").operate ("base64data").push (cb, 1).operate ("callback").execute ()
}

function twitter_oauth () {
    var url = "https://api.twitter.com/oauth/request_token"
    var method = "POST"
    var params = {
        oauth_callback: "http://localhost/oauth_callback",
        oauth_consumer_key: "7IoQbg88rT3GJ01HlTOc9A",
        oauth_nonce: "hoge" + Date.now (),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: Date.now ().toString (),
        oauth_version: "1.0"
    }

    var base = oauth_make_signature_base (url, method, params)
    console.debug ("base", base)
}

$(document).ready (function () {
    test_twitter_oauth ()
})
