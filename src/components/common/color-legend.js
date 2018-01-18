import React, {Component, PropTypes} from 'react';
import styled from 'styled-components';
import {createSelector} from 'reselect';
import {format} from 'd3-format';
import moment from 'moment';
import {SCALE_TYPES, SCALE_FUNC, ALL_FIELD_TYPES} from '../../constants/default-settings';
import {getTimeWidgetHintFormatter} from '../../utils/filter-utils';

const ROW_H = 10;
const GAP = 4;
const RECT_W = 20;

const StyledLegend = styled.div`  
  ${props => props.theme.dropdownScrollBar};
  
  max-height: 150px;
  overflow-y: overlay;
  
  svg {
    text {
      font-size: 9px;
      fill: ${props => props.theme.textColor};
    }
  }
`;

const defaultFormat = d => d;

const propTypes = {
  width: PropTypes.number.isRequired,
  scaleType: PropTypes.string.isRequired,
  domain: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object
  ]).isRequired,
  fieldType: PropTypes.string,
  range: PropTypes.arrayOf(PropTypes.string),
  abelFormat: PropTypes.func
};

const getTimeLabelFormat = (domain) => {
  const formatter = getTimeWidgetHintFormatter(domain);
  return val => moment.utc(val).format(formatter);
};

const getNumericLabelFormat = (domain) => {
  const diff = domain[1] - domain[0];

  if (diff < 10) {
    return format('.2f');
  }

  return format('.1f');
};

const getQuantLabelFormat = (domain, fieldType) => {

  // quant scale can only be assigned to linear Fields: real, timestamp, integer
  return fieldType === ALL_FIELD_TYPES.timestamp ?
    getTimeLabelFormat(domain) :
    !fieldType ? defaultFormat :
    getNumericLabelFormat(domain);
};

const getOrdinalLegends = scale => {
  const domain = scale.domain();
  return {
    data: domain.map(scale),
    labels: domain
  };
};

const getQuantLegends = (scale, labelFormat) => {
  const labels = scale.range().map(d => {
    const invert = scale.invertExtent(d);
    return `${labelFormat(invert[0])} to ${labelFormat(invert[1])}`;
  });

  return {
    data: scale.range(),
    labels
  };
};

export default class ColorLegend extends Component {
  domainSelector = props => props.domain;
  rangeSelector = props => props.range;
  labelFormatSelector = props => props.labelFormat;
  scaleTypeSelector = props => props.scaleType;
  fieldTypeSelector = props => props.fieldType;

  legendsSelector = createSelector(
    this.domainSelector,
    this.rangeSelector,
    this.scaleTypeSelector,
    this.labelFormatSelector,
    this.fieldTypeSelector,
    (domain, range, scaleType, labelFormat, fieldType) => {
      const scaleFunction = SCALE_FUNC[scaleType];
      // color scale can only be quantize, quantile or ordinal
      const scale = scaleFunction()
        .domain(domain)
        .range(range);

      if (scaleType === SCALE_TYPES.ordinal) {
        return getOrdinalLegends(scale);
      }

      const formatLabel = labelFormat || getQuantLabelFormat(scale.domain(), fieldType);

      return getQuantLegends(scale, formatLabel);
    }
  );

  render() {
    const {width, scaleType, domain, range, displayLabel = true} = this.props;

    if (!domain || !range || !scaleType) {
      return null;
    }

    const legends = this.legendsSelector(this.props);
    const height = legends.data.length * (ROW_H + GAP);

    return (
      <StyledLegend>
        <svg width={width - 24} height={height}>
          {legends.data.map((color, idx) => <LegendRow
            key={idx}
            label={legends.labels[idx]}
            displayLabel={displayLabel}
            color={color}
            idx={idx}/>
          )}
        </svg>
      </StyledLegend>
    );
  }
}

const LegendRow = ({label = '', displayLabel, color, idx}) => (
  <g transform={`translate(0, ${idx * (ROW_H + GAP)})`}>
    <rect width={RECT_W} height={ROW_H} style={{fill: color}}/>
    <text x={RECT_W + 8} y={ROW_H - 1}>{displayLabel ? label.toString() : ''}</text>
  </g>
);

ColorLegend.propTypes = propTypes;