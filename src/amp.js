const merge = require('deepmerge')

module.exports = function (layoutData, opts) {
  const renderData = {};
  const { prettier, helper } = opts;
  const { printer, utils } = helper;
  const _ = opts._;

  const COMPONENT_TYPE_MAP = {
    link: 'view',
    video: 'video',
    expview: 'view',
    scroller: 'scroll-view',
    slider: 'swiper',
    view: 'view',
    text: 'text',
    picture: 'image'
  };

  const line = (content, level) =>
    utils.line(content, { indent: { space: level * 2 } });
  
  const styleMap = {};

  const mockData = {
    data: {}
  };

  const scriptMap = {
    methods: {}
  };

  const getScriptStore = (originJson) => {
    return originJson.eventStore && originJson.scriptStore
      ? (originJson.eventStore || []).map(v => {
          const contentStore = (originJson.scriptStore || []).find(
            _v => _v.id === v.scriptId
          );
          return {
            belongId: v.belongId,
            content: contentStore && contentStore.content || '',
            eventType: v.type,
            scriptName: contentStore && contentStore.name || ''
          };
        })
      : originJson.scriptStore || [];
  };

  let scriptStore = getScriptStore(layoutData);

  let modConfig = layoutData.modStyleConfig || {
    designWidth: 750,
    designHeight: 1334
  };

  const normalizeStyleValue = (key, value) => {
    switch (key) {
      case 'font-size':
      case 'margin-left':
      case 'margin-top':
      case 'margin-right':
      case 'margin-bottom':
      case 'padding-left':
      case 'padding-top':
      case 'padding-right':
      case 'padding-bottom':
      case 'max-width':
      case 'width':
      case 'height':
      case 'border-width':
      case 'border-radius':
      case 'top':
      case 'left':
      case 'right':
      case 'bottom':
      case 'line-height':
      case 'letter-spacing':
      case 'border-top-right-radius':
      case 'border-top-left-radius':
      case 'border-bottom-left-radius':
      case 'border-bottom-right-radius':
        value = '' + value;
        value = value.replace(/(rem)|(px)/, '');
        value = (Number(value) * 750) / modConfig.designWidth;
        value = '' + value;

        if (value.length > 3 && value.substr(-3, 3) == 'rem') {
          value = value.slice(0, -3) + 'rpx';
        } else {
          value += 'rpx';
        }
        break;
      default:
        break;
    }
    return value;
  };

  const parseStyleObject = style =>
    Object.entries(style)
      .filter(([, value]) => value || value === 0)
      .map(([key, value]) => {
        key = _.kebabCase(key);
        return `${key}: ${normalizeStyleValue(key, value)};`;
      });
  
  const renderStyleItem = (className, style) => [
    line(`.${className} {`),
    ...parseStyleObject(style).map(item => line(item, 1)),
    line('}')
  ];

  const renderStyle = map =>
    [].concat(
      ...Object.entries(map).map(([className, style]) =>
        renderStyleItem(className, style)
      )
    );
  
  const normalizeTemplateAttrValue = value => {
      if (typeof value === 'string') {
        return JSON.stringify(value);
      } else {
        return `"${JSON.stringify(value)}"`;
      }
    };
  
  const renderTemplateAttr = (key, value) =>
      `${key}=${normalizeTemplateAttrValue(value)}`;
  
  const getFuncBody = content => {
    if (content) {
      return content.match(
        /(?:\/\*[\s\S]*?\*\/|\/\/.*?\r?\n|[^{])+\{([\s\S]*)\};$/
      )[1];
    }
    return '';
  };
  
  let depth = 0;
  let { dataBindingStore } = layoutData;

  // loops
  let loopData = layoutData.loops || [];
  let loopSourceKey = null;

  loopData.forEach((v) => {
    let loopDataBinding = dataBindingStore.filter((_v) => {
      return _v.belongId == v.loopNode.id && _v.target[0] == 'loop' && _v.value.source && _v.value.sourceValue;
    });

    if (loopDataBinding && loopDataBinding[0] && v.shadowNode && v.shadowNode.length > 0) {
      loopSourceKey = loopDataBinding[0].value.sourceValue;
      v.isValidLoop = true;
    }
  });

  const findValidLoop = (json, loops) => {
    let isValidLoopNode = null;
    let isValidShadowNode = null;
    let loopKey = '';
    let validLoopIds = [];
    loops.forEach((v) => {
      if (v.isValidLoop && v.loopNode.id == json.id) {
        isValidLoopNode = true;
        loopKey = v.loopKey;
        validLoopIds = [v.loopNode.id, ...v.shadowNode];
      }
      if (v.isValidLoop && v.shadowNode.indexOf(json.id) != -1) {
        isValidShadowNode = true;
        loopKey = v.loopKey;
      }
    });
    return {
      isValidLoopNode,
      isValidShadowNode,
      loopKey,
      validLoopIds
    };
  }

  // 用于循环mock数据复制
  const loopMockDataCountMap = {};

  function copyLoopMockData(json) {
      if (!json || typeof json != 'object') return;
      Object.keys(json).forEach((key) => {
        let count = loopMockDataCountMap[key] || 0;
        if (count > 0) {
          while (count > 0 && json[key].length < count) {
            json[key].push(json[key][0]);
          }
          json[key].forEach((v) => {
            copyLoopMockData(v);
          });
        }
      });
  }

  const renderTemplate = (obj, level = 0, loopMockSource = null) => {
    depth = depth + 1;

    // 数据绑定
    let domDataBinding = [];
    if (Array.isArray(dataBindingStore)) {
      domDataBinding = dataBindingStore.filter(v => {
        if (v.belongId == obj.id) {
          if (v.value && v.value.isStatic) {
            return true;
          } else {
            if (v.value) {
              const source = v.value.source;
              const sourceValue = v.value.sourceValue;
              if (source && sourceValue) {
                return true;
              }
            }
            return false;
          }
        }
      });
    }

    // script binding
    if (Array.isArray(scriptStore)) {
      // 事件绑定
      if (scriptStore.length > 0) {
        scriptStore.forEach(
          ({ belongId, eventType, scriptName, content }, index) => {
            content = content || '';
            if (belongId === obj.id) {
                if (eventType === 'onClick') {
                  obj.attrs['onTap'] = scriptName;

                  scriptMap.methods[scriptName] = `
                    function () {
                      ${getFuncBody(content)}
                    }
                  `;
                } else if (eventType === 'onAppear') {
                  obj.attrs['onAppear'] = scriptName;

                  scriptMap.methods[scriptName] = `
                    function () {
                      ${getFuncBody(content)}
                    }
                  `;
                }
            }
          }
        );
      }
    }

    obj.element = COMPONENT_TYPE_MAP[obj.componentName] || obj.componentName.toLowerCase();
    if (!obj.props) obj.props = {};
    if (obj.props.style) {
      obj.style = obj.props.style;
      delete obj.props.style;
    } else {
      obj.style = {}
    }
    obj.attrs = obj.props;

    if (obj.type && obj.type.toLowerCase() === 'repeat') {
      obj.style.display = 'flex';
      obj.style.flexDirection = 'row';
      obj.children.forEach(function(child) {
        delete child.style.marginTop;
      });
    }

    if (obj.style.borderWidth) {
      obj.style.boxSizing = 'border-box';
    }

    function sliceData(v) {
      return v.slice(7, v.length - 1);
    }
    
    domDataBinding.map(item => {
      const target = item.target[0];
      const defaultValue = item.defaultValue;
      const source = item.value.source;

      if (item.value.isStatic) {
        // 静态数据
        obj.attrs[target] = item.value.value;
      } else {
        const sourceValue = item.value.sourceValue;
        let value = '';
        if (Array.isArray(sourceValue)) {
          value = sourceValue
            .map(item => {
              if (item.type === 'DYNAMIC') {

                const md_arr = sliceData(item.value).split(".");

                const md_result = md_arr.map((md, index) => {
                  if (index === md_arr.length - 1) {
                    return `{"${md}": "${defaultValue}"`;
                  } else {
                    return `{"${md}": `;
                  }
                })

                md_arr.forEach(() => {
                  md_result.push('}');
                });

                return `{{${item.value.slice(2, -1)}}}`;
              }
              return item.value;
            })
            .join('');
        } else {
          // 通过schema绑定 @TODO
          value = `{{${item.value.source}.${item.value.sourceValue}}}`;
        }
        if (target === 'show') {
          obj.attrs['a:if'] = value;
        } else if (target === 'innerText') {
          obj.innerText = value;
        } else {
          obj.attrs[target] = value;
        }
      }
    });

    switch (obj.element) {
      case 'view':
        obj.element = 'view';
        obj.style.display = 'flex';
        break;
      case 'picture':
        obj.element = 'image';
        obj.children = null;
        break;
      case 'text':
        obj.children = obj.innerText || obj.attrs.text;
        break;
    }

    if (obj.style.lines == 1 || obj.attrs.lines == 1) {
      delete obj.style.width;
    }

    delete obj.style.lines;
    delete obj.attrs.x;
    delete obj.attrs.y;

    if (obj.attrs.className) {
      obj.attrs.class = _.kebabCase(obj.attrs.className);
      delete obj.attrs.className;
    }

    if (obj.attrs.source && obj.attrs.src) {
      obj.attrs.src = obj.attrs.source || obj.attrs.src;
      delete obj.attrs.source;
    }

    obj.attrs.class = `${obj.attrs.class}`;

    styleMap[obj.attrs.class] = {
      ...styleMap[obj.attrs.class],
      ...obj.style
    };

    let ret = [];
    let nextLine = '';

    const attrs = Object.entries(obj.attrs).filter(([key, value]) => {
      if (obj.element === 'image') {
        return ['class', 'src', 'onTap', 'onAppear'].includes(key);
      } else if (obj.element === 'video') {
        return [
          'class',
          'src',
          'controls',
          'autoplay',
          'muted',
          'poster',
          'onTap',
          'onAppear'
        ].includes(key);
      }
      return ['class', 'onTap', 'onAppear'].includes(key);
    });

    const validLoop = findValidLoop(obj, loopData);
    if (validLoop.isValidLoopNode && !obj.ignoreLoop) {
      obj.ignoreLoop = true;

      let loopDomDataBinding = dataBindingStore.filter((data) => {
        return data.belongId == obj.id && data.target[0] == 'loop';
      })[0] || {};

      const { source, sourceValue } = loopDomDataBinding.value;

      loopMockDataCountMap[sourceValue] = validLoop.validLoopIds.length;

      if (!loopMockSource) {
        loopMockSource = {};
        mockData[source] = mockData[source] ? mockData[source] : {};
        mockData[source][sourceValue] = [];
        mockData[source][sourceValue][0] = {};
      }

      if (attrs.length > 3) {
        ret.push(line(`<${obj.element} a:for="{{${source}.${sourceValue}}}"`, level));
        ret = ret.concat(
          attrs.map(([key, value]) => {
            if (value.match(/\{\{.*\}\}/g) && loopMockSource) {
              value = value.replace(/data/g, 'item');
            }
            return line(renderTemplateAttr(key, value), level + 1)
          })
        );
      } else {
        nextLine = `<${obj.element} a:for="{{${source}.${sourceValue}}}"`;
        if (attrs.length) {
          nextLine += ` ${attrs
            .map(([key, value]) => {
              if (value.match(/\{\{.*\}\}/g) && loopMockSource) {
                value = value.replace(/data/g, 'item');
              }
              return renderTemplateAttr(key, value);
            })
            .join(' ')}`;
        }
      }
  
      if (obj.children) {
        if (Array.isArray(obj.children) && obj.children.length) {
          // 多行 Child
          ret.push(line(`${nextLine}>`, level));
          ret = ret.concat(
            ...obj.children.map(o => renderTemplate(o, level + 1, loopMockSource))
          );
          ret.push(line(`</${obj.element}>`, level));
        } else {
          // 单行 Child
          ret.push(line(`${nextLine}>${obj.children}</${obj.element}>`, level));
        }
      } else {
        // 自闭合标签
        ret.push(line(`${nextLine} />`, level));
      }

    } else if (validLoop.isValidShadowNode) {
      // 有效循环影子节点，不需要生成代码
    } else {

      if (attrs.length > 3) {
        ret.push(line(`<${obj.element}`, level));
        ret = ret.concat(
          attrs.map(([key, value]) => {
            if (value.match(/\{\{.*\}\}/g) && loopMockSource) {
              value = value.replace(/data/g, 'item');
            }
            return line(renderTemplateAttr(key, value), level + 1)
          })
        );
      } else {
        nextLine = `<${obj.element}`;
        if (attrs.length) {
          nextLine += ` ${attrs
            .map(([key, value]) => {
              if (value.match(/\{\{.*\}\}/g) && loopMockSource) {
                value = value.replace(/data/g, 'item');
              }
              return renderTemplateAttr(key, value);
            })
            .join(' ')}`;
        }
      }
  
      if (obj.children) {
        if (Array.isArray(obj.children) && obj.children.length) {
          // 多行 Child
          ret.push(line(`${nextLine}>`, level));
          ret = ret.concat(
            ...obj.children.map(o => renderTemplate(o, level + 1, loopMockSource))
          );
          ret.push(line(`</${obj.element}>`, level));
        } else {
          // 单行 Child
          if (loopMockSource) {
            if (obj.children && !Array.isArray(obj.children)) {
              obj.children = obj.children.replace(/data/g, 'item');
            }
          }
          ret.push(line(`${nextLine}>${obj.children}</${obj.element}>`, level));
        }
      } else {
        // 自闭合标签
        ret.push(line(`${nextLine} />`, level));
      }

    }

    // generate mock data
    domDataBinding.map(item => {
      const target = item.target[0];
      const defaultValue = item.defaultValue;
      const source = item.value.source;

      if (item.value.isStatic) {
        // 静态数据 do nothing
      } else {
        const sourceValue = item.value.sourceValue;
        let value = '';
        if (Array.isArray(sourceValue)) {
          value = sourceValue
            .map(item => {
              if (item.type === 'DYNAMIC') {

                const md_arr = sliceData(item.value).split(".");

                const md_result = md_arr.map((md, index) => {
                  if (index === md_arr.length - 1) {
                    return `{"${md}": "${defaultValue}"`;
                  } else {
                    return `{"${md}": `;
                  }
                })

                md_arr.forEach(() => {
                  md_result.push('}');
                });

                const obj_data = JSON.parse(md_result.join(''));

                if (loopMockSource && loopSourceKey) {
                  loopMockSource = {
                    ...loopMockSource,
                    ...obj_data
                  }

                  mockData[source][loopSourceKey][0] = merge(mockData[source][loopSourceKey][0], obj_data);
                } else {
                  mockData[source] = merge(mockData[source], obj_data);
                }

                return `{{${item.value.slice(2, -1)}}}`;
              }
              return item.value;
            })
            .join('');
        } else {
          // 通过schema绑定 @TODO
          value = `{{${item.value.source}.${item.value.sourceValue}}}`;
        }
      }
    });


    return ret;
  };

  const renderScript = (scriptMap = {}, dataBindingStore = {}) => {
    const {methods} = scriptMap;
    return `
      Component({
        data: {},
        props:{
          data: ${JSON.stringify(dataBindingStore)}
        },
        didMount(prevProps,prevData){},
        didUnmount(){},
        methods:{
          ${Object.entries(methods)
            .map(([key, value]) => {
              if (key) {
                return `${key}: ${value}`;
              }
            })
            .join(',')}
        }
      })
    `;
  };


  renderData.axml = printer(renderTemplate(layoutData));
  renderData.acss = printer(renderStyle(styleMap));

  copyLoopMockData(mockData.data);

  renderData.ajs = prettier.format(renderScript(scriptMap, mockData.data), {
    parser: 'babel'
  });
  renderData.ajson = printer([
    line('{'),
    line('"component": true,', 1),
    line('"usingComponents": {}', 1),
    line('}')
  ]);

  return {
    renderData: renderData,
    panelDisplay: [
      {
          panelName: 'index.axml',
          panelValue: renderData.axml,
          panelType: 'BuilderRaxView',
          mode: 'xml'
      },
      {
          panelName: 'index.acss',
          panelValue: renderData.acss,
          panelType: 'BuilderRaxStyle',
          mode: 'css'
      },
      {
          panelName: 'index.js',
          panelValue: renderData.ajs,
          panelType: 'BuilderRaxView',
          mode: 'javascript'
      },
      {
        panelName: 'index.json',
        panelValue: renderData.ajson,
        panelType: 'BuilderRaxView',
        mode: 'javascript'
      }
    ],
    prettierOpt: {},
    noTemplate: true
  };
}