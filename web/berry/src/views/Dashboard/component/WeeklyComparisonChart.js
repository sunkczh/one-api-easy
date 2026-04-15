import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { Grid, Typography, Box } from '@mui/material';

// third-party
import Chart from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// ==============================|| DASHBOARD - WEEKLY COMPARISON CHART ||============================== //

const formatTokenCount = (count) => {
  if (count >= 1000000) return (count / 1000000).toFixed(2) + 'M';
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
  return count.toLocaleString();
};

const WeeklyComparisonChart = ({ isLoading }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [emptyLastWeek, setEmptyLastWeek] = useState(false);

  const fetchComparison = async () => {
    try {
      const res = await fetch('/api/user/dashboard/weekly-comparison', {
        credentials: 'include'
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.message || '请求失败');
      }

      const thisWeek = json.data.this_week?.daily || [];
      const lastWeek = json.data.last_week?.daily || [];

      setEmptyLastWeek(lastWeek.length === 0);

      if (thisWeek.length === 0 && lastWeek.length === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      // X轴: 取本周日期，若上周有而本周没有则补齐
      const categories = thisWeek.map((d) => d.date.slice(5)); // MM-DD

      const options = {
        chart: {
          type: 'line',
          height: 320,
          toolbar: { show: false },
          zoom: { enabled: false },
          background: 'transparent'
        },
        stroke: {
          curve: 'smooth',
          width: [3, 3],
          dashArray: [0, 5] // 本周实线，上周虚线
        },
        colors: ['#008FFB', '#FF4560'], // 蓝色本周，红色上周
        xaxis: {
          categories,
          labels: {
            style: {
              fontSize: '12px',
              fontFamily: "'Roboto', sans-serif"
            }
          }
        },
        yaxis: {
          labels: {
            formatter: (val) => formatTokenCount(val),
            style: {
              fontSize: '12px',
              fontFamily: "'Roboto', sans-serif"
            }
          }
        },
        legend: {
          show: true,
          position: 'top',
          fontSize: '14px',
          fontFamily: "'Roboto', sans-serif",
          labels: {
            useSeriesColors: true
          },
          markers: {
            width: 12,
            height: 12,
            radius: 3
          },
          itemMargin: {
            horizontal: 12,
            vertical: 4
          }
        },
        grid: {
          show: true,
          borderColor: '#e0e0e0',
          strokeDashArray: 3
        },
        tooltip: {
          theme: 'dark',
          y: {
            formatter: (val) => val.toLocaleString() + ' tokens'
          }
        },
        responsive: [
          {
            breakpoint: 480,
            options: {
              legend: {
                position: 'bottom'
              }
            }
          }
        ]
      };

      const series = [
        { name: '本周', data: thisWeek.map((d) => d.token_count) },
        { name: '上周', data: lastWeek.map((d) => d.token_count) }
      ];

      setChartData({ options, series });
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch weekly comparison:', err);
      setError(err.message || '数据加载失败');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
    const interval = setInterval(fetchComparison, 5 * 60 * 1000); // refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (isLoading || loading) {
    return (
      <MainCard>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12}>
            <Typography variant="h3">本周 vs 上周 Token 消耗对比</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                minHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="body1" color="textSecondary">
                加载中...
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12}>
            <Typography variant="h3">本周 vs 上周 Token 消耗对比</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                minHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="body1" color="error">
                {error}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </MainCard>
    );
  }

  return (
    <MainCard>
      <Grid container spacing={gridSpacing}>
        <Grid item xs={12}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h3">本周 vs 上周 Token 消耗对比</Typography>
            </Grid>
            {emptyLastWeek && (
              <Grid item>
                <Typography variant="body2" color="textSecondary">
                  (上周暂无数据)
                </Typography>
              </Grid>
            )}
          </Grid>
        </Grid>
        <Grid item xs={12}>
          {chartData && chartData.series[0].data.length > 0 ? (
            <Chart
              options={chartData.options}
              series={chartData.series}
              type="line"
              height={320}
            />
          ) : (
            <Box
              sx={{
                minHeight: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="h3" color="#697586">
                暂无数据
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </MainCard>
  );
};

WeeklyComparisonChart.propTypes = {
  isLoading: PropTypes.bool
};

export default WeeklyComparisonChart;
