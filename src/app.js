const amp_converter = require('./amp');
const h5_converter = require('./h5');

module.exports = function(layoutData, opts) {
  const h5_result = h5_converter(layoutData, opts);
  const amp_result = amp_converter(layoutData, opts);

  const renderData = {
    ...h5_result.renderData,
    ...amp_result.renderData
  }

  const panelDisplay = amp_result.panelDisplay.concat(h5_result.panelDisplay)
  // const panelDisplay = amp_result;

  return {
    renderData,
    panelDisplay,
    noTemplate: true,
    prettierOpt: {}
  }
}