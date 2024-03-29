const co = require('co');
const xtpl = require('xtpl');
const fs = require('fs');
const thunkify = require('thunkify');
const path = require('path');
const prettier = require('prettier');
const {NodeVM} = require('vm2');
const _ = require('lodash');
const dslHelper = require('@imgcook/dsl-helper');

// const data = {"id":"id_","_jsonElementId":"id_","componentType":"view","children":[{"componentType":"view","_jsonId":5535506514,"id":"id_5535506514","_jsonElementId":"id_5535506514","title":"View","attrs":{"className":"itemTitleWrap","x":"0","y":"0"},"style":{"width":750,"height":674,"alignItems":"flex-start","flexDirection":"column","justifyContent":"center","backgroundColor":"rgba(242,242,242,1)","marginLeft":0,"marginTop":0},"children":[{"_jsonId":6189747253,"_jsonElementId":"id_6189747253","attrs":{"className":"itemTitle","x":"24","y":"50"},"style":{"width":505,"height":53,"fontFamily":"PingFangSC","fontSize":"38","color":"#383D48","lineHeight":"53rem","lines":1,"fontWeight":500,"marginLeft":24},"id":"id_6189747253","innerText":"Hello, DSL Plugin Developer","componentType":"text","title":"Text","leaf":true,"tpl":"shop_items[0].item_title","schema":[{"schemaId":66616,"parent":"dataSource","key":"shop_items[0].item_title","value":"商品标题"}]},{"_jsonId":2798596018,"_jsonElementId":"id_2798596018","attrs":{"className":"shopManjianWrap"},"style":{"width":689,"height":491,"backgroundImage":"linear-gradient(to top right, rgba(247,214,160,1), rgba(216,177,136,1))","borderRadius":8,"marginLeft":27,"marginTop":30,"flexDirection":"column","justifyContent":"flex-start"},"id":"id_2798596018","componentType":"view","title":"View","children":[{"_jsonId":3568417879,"_jsonElementId":"id_3568417879","attrs":{"className":"shopManjian","x":"48","y":"162"},"style":{"width":128,"height":45,"fontFamily":"PingFangSC","fontSize":"32","color":"rgba(132,131,131,0.79)","lineHeight":"45rem","lines":1,"fontWeight":500,"marginLeft":21,"marginTop":29},"id":"id_3568417879","innerText":"快速上手","componentType":"text","title":"Text","leaf":true,"tpl":"shop_manjian","schema":[{"schemaId":66616,"parent":"dataSource","key":"shop_manjian","value":"大促满减，格式：满100减10"}]},{"_jsonId":3638853664,"_jsonElementId":"id_3638853664","attrs":{"className":"shopItemsItemUrlGroup"},"style":{"flexDirection":"column","marginTop":14,"alignItems":"center","width":689},"id":"id_3638853664","componentType":"view","title":"View","children":[{"_jsonId":187362658,"_jsonElementId":"id_187362658","attrs":{"className":"itemUrl","x":"49","y":"221"},"style":{"width":646,"height":48,"fontFamily":"PingFangSC","fontSize":"34","color":"#FFFFFF","lineHeight":"48rem","lines":1,"fontWeight":500},"id":"id_187362658","innerText":"如何开发一个适合自己使用的多语言插件？","componentType":"text","title":"Text","leaf":true,"tpl":"shop_items[0].item_url","schema":[{"schemaId":66616,"parent":"dataSource","key":"shop_items[0].item_url","value":"商品点击链接（主要解决P4P商品的点击链接是非detail真实链接的问题）"}]}],"leaf":false},{"_jsonId":7395326773,"_jsonElementId":"id_7395326773","attrs":{"className":"pictureGroup"},"style":{"flexDirection":"column","marginTop":37,"alignItems":"center","width":689},"id":"id_7395326773","componentType":"view","title":"View","children":[{"_jsonId":1691208347,"_jsonElementId":"id_1691208347","attrs":{"className":"picture","src":"https://gw.alicdn.com/tfs/TB1CVzieCCWBuNjy0FhXXb6EVXa-400-376.png"},"style":{"width":200,"height":188},"id":"id_1691208347","componentType":"picture","title":"Picture","leaf":true}],"leaf":false},{"_jsonId":1356317646,"_jsonElementId":"id_1356317646","attrs":{"className":"demoWrap"},"style":{"width":112,"height":43,"backgroundColor":"rgba(237,237,232,1)","borderRadius":50,"marginLeft":548,"flexDirection":"column","marginTop":66,"alignItems":"center","justifyContent":"flex-start"},"id":"id_1356317646","componentType":"view","title":"View","children":[{"_jsonId":4853147365,"_jsonElementId":"id_4853147365","attrs":{"className":"demo"},"style":{"width":40,"height":28,"fontFamily":"PingFangSC","fontSize":"20","color":"#B38765","lineHeight":"28rem","lines":1,"fontWeight":500,"marginTop":6},"id":"id_4853147365","innerText":"试玩","componentType":"text","title":"Text","leaf":true}],"leaf":false}],"leaf":false}],"leaf":false}],"attrs":{"className":"itemTitleOuter","x":"0","y":"0"},"style":{"width":"750","height":"1334"},"leaf":false};
// var originData = {"type":"Block","id":"Block-1","props":{"style":{"width":750,"height":674}},"children":[{"props":{"style":{"width":750,"height":674,"left":0,"top":0,"backgroundColor":"rgba(242,242,242,1)"}},"children":[],"type":"div","id":"Div-0"},{"props":{"style":{"width":689,"height":491,"left":27,"top":131,"backgroundImage":"linear-gradient(to top right, rgba(247,214,160,1), rgba(216,177,136,1))","borderRadius":8}},"children":[],"type":"div","id":"Div-1"},{"props":{"style":{"width":505,"height":53,"left":24,"top":48,"fontFamily":"PingFangSC","fontSize":"38","color":"#383D48","lineHeight":"53rem","lines":1,"fontWeight":500},"children":"Hello, DSL Plugin Developer"},"type":"div","id":"Div-2"},{"props":{"style":{"width":646,"height":48,"left":48,"top":219,"fontFamily":"PingFangSC","fontSize":"34","color":"#FFFFFF","lineHeight":"48rem","lines":1,"fontWeight":500},"children":"如何开发一个适合自己使用的多语言插件？"},"type":"div","id":"Div-3"},{"props":{"style":{"width":128,"height":45,"left":48,"top":160,"fontFamily":"PingFangSC","fontSize":"32","color":"rgba(132,131,131,0.79)","lineHeight":"45rem","lines":1,"fontWeight":500},"children":"快速上手"},"type":"div","id":"Div-4"},{"props":{"style":{"width":112,"height":43,"left":575,"top":558,"backgroundColor":"rgba(237,237,232,1)","borderRadius":50}},"children":[],"type":"div","id":"Div-5"},{"props":{"style":{"width":40,"height":28,"left":611,"top":564,"fontFamily":"PingFangSC","fontSize":"20","color":"#B38765","lineHeight":"28rem","lines":1,"fontWeight":500},"children":"试玩"},"type":"div","id":"Div-6"},{"props":{"style":{"width":200,"height":188,"left":269,"top":304},"src":"https://gw.alicdn.com/tfs/TB1CVzieCCWBuNjy0FhXXb6EVXa-400-376.png"},"children":[],"type":"Image","id":"Image-7"}]}; // eslint-disable-line

const data = require('./data.json');

const vm = new NodeVM({
  console: 'inherit',
  sandbox: {},
  require: {
    external: {
      modules: [path.resolve(__dirname, "../src/amp.js"), path.resolve(__dirname, "../src/h5.js")]
    }
  }
});

function mkDirsSync(dirname) {
  if (fs.existsSync(dirname)) {
    return true;
  } else {
    if (mkDirsSync(path.dirname(dirname))) {
      fs.mkdirSync(dirname);
      return true;
    }
  }
}
const codePath = path.join(__dirname, '../code');
const componentPath = path.join(__dirname, '../code/component');
if (!fs.existsSync(codePath)) {
  fs.mkdirSync(codePath);
}
if (!fs.existsSync(componentPath)) {
  fs.mkdirSync(componentPath);
}

co(function*() {
  const xtplRender = thunkify(xtpl.render);
  const code = fs.readFileSync(path.resolve(__dirname, '../src/app.js'), 'utf8');
  const renderInfo = vm.run(code, 
    path.resolve(__dirname, "../src/h5.js"), path.resolve(__dirname, "../src/amp.js")
  )(data, {
    prettier: prettier,
    _: _,
    helper: dslHelper
  });
  
  const { axml, acss, ajs, ajson } = renderInfo.renderData;
  // fs.ensureDirSync(path.resolve(__dirname, './template'));
  fs.writeFileSync(path.join(__dirname, '../code/component/index.axml'), axml);
  fs.writeFileSync(path.join(__dirname, '../code/component/index.acss'), acss);
  fs.writeFileSync(path.join(__dirname, '../code/component/index.js'), ajs);
  fs.writeFileSync(path.join(__dirname, '../code/component/index.json'), ajson);

  const { css, html, js } = renderInfo.renderData;
  fs.writeFileSync(path.join(__dirname, '../code/demo.css'), css);
  fs.writeFileSync(path.join(__dirname, '../code/demo.html'), html);
  fs.writeFileSync(path.join(__dirname, '../code/demo.js'), js);
});
