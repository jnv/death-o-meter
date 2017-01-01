'use strict'

var tooltip;

var CIRCLE_R = 2.5
var CHART_MARGIN = {top: CIRCLE_R, right: CIRCLE_R, bottom: 30, left: CIRCLE_R}
var TOTALS

var YEAR_DESC = {
  2011: 'The year 2011 stole from us Amy Winehouse, Steve Jobs, Václav Havel and Elizabeth Taylor. But it was also the last year for Muammar al-Quaddafi, Osama bin Laden and Kim Jong Il.',
  2012: 'In 2012 among deceased celebrities we could find Larry Hangman, Etta James, Whitney Houston and Neil Armstrong.',
  2013: 'In 2013, the number of deceased people was the highest. Among the people who left this world there were Nelson Mandela, Paul Walker, Lou Reed or Margaret Tatcher.',
  2014: 'In 2014 the world lost a whole load of noticeable people. To name just some of them, we need to mention Robin Wiliams, Shirley Temple, Gabriel García Marquéz and Maya Angelou',
  2015: 'In 2015 a whole lead of famous people passed away. To name some, the world lost B.B. King, Christohper Lee, Lemmy Kilmister or Omar Sharif.',
  2016: 'The 2016 still remains in our mind as the most recent, so there is not really a need to remind the passing of Alan Rickman, Leonard Cohen, Prince or George Michael.',
}

function prop (name) {
  return function (obj) {
    return obj[name]
  }
}

function parseRow (d) {
  return {
    category: d.category,
    name: d.name,
    cause: d.cause,
    date: new Date(d.death),
  }
}

var MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

var CATEGORIES = {
  actors: true,
  singers: true,
  writers: true,
}

function monthName (i) {
  return MONTH_NAMES[i]
}

var formatDate = d3.timeFormat("%Y-%m-%d")
var formatMonth = d3.timeFormat("%Y-%m")
var formatDateFull = d3.timeFormat("%B %e, %Y")

function yearNest () {
  return d3.nest()
    .key(function(d) { return d.date.getFullYear() }).sortKeys(d3.ascending)
}

function groupByDay () {
  return d3.nest()
    .key(function(d) { return formatDate(d.date) })
    .sortKeys(d3.ascending)
    .sortValues(function (a, b) { return d3.ascending(a.category, b.category) })
}

function calculateTotals (data) {
  return yearNest()
    .key(function(d) { return d.category })
    .rollup(function(leaves) { return leaves.length })
    .map(data)
}

function updateCounts (data, target) {
  var prefix = '.js-count-' + target + '-'

  var total = 0
  var others = 0
  data.each(function(count, cat) {
    d3.selectAll(prefix + cat).text(count)
    if (CATEGORIES[cat]) {
      total += count
    } else {
      others += count
    }
  })
  d3.selectAll(prefix + 'total').text(total)
  d3.selectAll(prefix + 'others').text(others)
}

function groupByMonth () {
  return d3.nest()
    .key(function (d) { return d.date.getMonth() })
    .sortKeys(d3.ascending)
    // .sortValues(function (a, b) { return d3.ascending(a.date, b.date) })
    .sortValues(function (a, b) { return d3.ascending(a.category, b.category) })
}

function personCategory (category) {
  return category.replace(/s$/, '')
}

function showTooltip (data, position) {
  var d = data
  tooltip.attr('class', 'active')

  var html = '<strong>' + d.name + '</strong> '
  html += '(' + personCategory(d.category) + ')<br>'
  html += formatDateFull(d.date)
  if (d.cause) {
    html += '<br>' + d.cause
  }

  tooltip.html(html)
    .style('left', (position.x) + 'px')
    .style('top', (position.y - 28) + 'px')
}

function hideTooltip () {
  tooltip.attr('class', '')
}



function dailyChart (data, year, svg) {
  var circleR = CIRCLE_R
  var margin = CHART_MARGIN
  var width = +svg.attr('width') - margin.left - margin.right
  var height = +svg.attr('height') - margin.top - margin.bottom
  var xScale = d3.scaleTime()
    .domain([new Date(year, 0, 1), new Date(year, 11, 30)])
    .range([0, width])

  var xAxis = d3.axisBottom(xScale)
                .ticks(d3.utcMonth.every(1))
                .tickFormat(d3.timeFormat('%B'))
  // var x = d3.scaleBand().rangeRound([0, width]).padding(0.1)

  var yScale = d3.scaleLinear()
          .range([height, 0])
          .domain([0, 25]) // XXX assumes there's max n points per day

  var g = svg.append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  g.append('g')
      .attr('class', 'axis axis-x')
      .attr('transform', 'translate(0,' + (height + 6) + ')')
      .call(xAxis)

  var days = g.selectAll('.day')
    .data(data)
    .enter().append('g')
      .attr('class', 'day')
      .attr('data-date', function (d) { return d.key })

  days.selectAll('circle.person')
    .data(function (d, i) { return d.values })
    .enter().append('circle')
    .attr('data-name', prop('name'))
    .attr('data-category', prop('category'))
    .attr('data-cause', prop('cause'))
    .attr('class', 'person')
    .attr('r', circleR)
    .attr('cx', function (d) {
      return xScale(d.date)
    })
    .attr('cy', function (d, i) {
      return yScale(i)
    })
    .on('mouseover', function(d) {
       showTooltip(d, {x: d3.event.pageX, y: d3.event.pageY})
     })
    .on('mouseout', hideTooltip);
}

function monthlyChart (data, svg, options) {
  var passedOptions = options
  if (!passedOptions) {
    passedOptions = {}
  }

  var defaults = {
    invert: false,
    axis: true,
  }

  var options = Object.assign({}, defaults, passedOptions)

  var circleR = CIRCLE_R
  var margin = CHART_MARGIN
  var width = +svg.attr('width') - margin.left - margin.right
  var height = +svg.attr('height') - margin.top - margin.bottom
  var xScale = d3.scaleBand()
    .rangeRound([0, width])
    .padding(0.1)
    .domain(data.map(prop('key')))

  var yScale = d3.scaleLinear()
          .domain([0, 25]) // XXX assumes there's max n points per day
          .range([height, 0])

  if (options.invert) {
    yScale.range([0, height])
  }

  var dotsPerMonth = Math.floor(xScale.bandwidth() / (circleR * 2))

  // var x = d3.scaleBand().rangeRound([0, width]).padding(0.1)

  svg.select('g.root').remove()

  var g = svg.append('g')
      .attr('class', 'root')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  if (options.axis) {
    var xAxis = d3.axisBottom(xScale)
                  .tickFormat(monthName)
    g.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', 'translate(0,' + (height + 5) + ')')
        .call(xAxis)
  }

  var days = g.selectAll('.month')
    .data(data)
    .enter().append('g')
      .attr('class', 'month')
      .attr('data-month', function (d) { return d.key })
      .attr('transform', 'translate(' + circleR * 2 + ',0)')

  days.selectAll('circle.person')
    .data(function (d) { return d.values })
    .enter().append('circle')
    .attr('data-name', prop('name'))
    .attr('data-category', prop('category'))
    .attr('data-cause', prop('cause'))
    .attr('class', 'person')
    .attr('r', circleR)
    .attr('cx', function (d, i) {
      return xScale(d.date.getMonth()) + (i % dotsPerMonth) * (circleR * 2)
    })
    .attr('cy', function (d, i) {
      return yScale(Math.floor(i / dotsPerMonth))
    })
    .on('mouseover', function(d) {
       showTooltip(d, {x: d3.event.pageX, y: d3.event.pageY})
     })
    .on('mouseout', hideTooltip)
}

d3.json('data.json', function (error, rawData) {
  if (error) {
    throw error
  }

  tooltip = d3.select('body').append('div')
    .attr('id', 'chart-tooltip')

  var data = rawData.map(parseRow)

  TOTALS = calculateTotals(data)
  updateCounts(TOTALS.get(2016), 2016)

  var years = yearNest().object(data)
  var yearByDay = groupByDay().entries(years['2016'])
  var yearByMonth = groupByMonth().entries(years['2016'])

  dailyChart(yearByDay, 2016, d3.select('#chart-daily'))
  monthlyChart(yearByMonth, d3.select('#chart-compare-base'))

  function setComparison(year) {
    d3.selectAll('.js-cmp-year').text(year)
    d3.select('#js-cmp-desc').html(YEAR_DESC[year])
    updateCounts(TOTALS.get(year), 'cmp')
    monthlyChart(
      groupByMonth().entries(years[year]),
      d3.select('#chart-compare-cmp'),
      {invert: true, axis: false}
    )
  }

  setComparison(2015)

  var $yearSelect = d3.select('#js-cmp-year-select')

  $yearSelect.on('change', function(e) {
    var value = $yearSelect.node().value
    setComparison(value)
  })
})
