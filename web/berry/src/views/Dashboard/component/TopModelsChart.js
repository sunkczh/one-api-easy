import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

// material-ui
import { Grid, Typography, Box } from '@mui/material';

// third-party
import Chart from 'react-apexcharts';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// ==============================|| DASHBOARD - TOP MODELS CHART ||============================== //

const COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#999999'];

const TopModelsChart = ({ isLoading }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTopModels = async () => {
    try {
      const res = await fetch('/api/user/dashboard/top-models', {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success && json.data) {
        const topModels = json.data.top_models || [];
        if (topModels.length > 0) {
          const labels = topModels.map((m) => m.model);
          const series = topModels.map((m) => m.token_count);

          const options = {
            labels,
            colors: COLORS.slice(0, topModels.length),
            chart: {
              type: 'donut',
              background: 'transparent',
              toolbar: { show: false },
              zoom: { enabled: false }
            },
            plotOptions: {
              pie: {
                donut: {
                  size: '65%',
                  labels: {
                    show: true,
                    name: { show: true, fontSize: '14px', fontFamily: "'Roboto', sans-serif" },
                    value: {
                      show: true,
                      fontSize: '13px',
                      fontFamily: "'Roboto', sans-serif",
                      formatter: (val) => val.toLocaleString()
                    },
                    total: {
                      show: true,
                      label: '总计',
                      fontSize: '14px',
                      fontFamily: "'Roboto', sans-serif",
                      color: '#697586',
                      formatter: (w) => {
                        return w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString();
                      }
                    }
                  }
                }
              }
            },
            dataLabels: {
              enabled: true,
              formatter: (val, opts) => {
                return val > 5 ? val.toFixed(1) + '%' : '';
              },
              style: { fontSize: '12px', fontFamily: "'Roboto', sans-serif" }
            },
            legend: {
              show: true,
              position: 'bottom',
              fontSize: '12px',
              fontFamily: "'Roboto', sans-serif",
              markers: { width: 10, height: 10, radius: 3 },
              itemMargin: { horizontal: 8, vertical: 4 }
            },
            stroke: { width: 1, colors: ['#fff'] },
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
                  legend: { position: 'bottom' }
                }
              }
            ]
          };

          setChartData({ options, series });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch top models:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopModels();
    const interval = setInterval(fetchTopModels, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTokenCount = (count) => {
    if (count >= 1000000) return (count / 1000000).toFixed(2) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toLocaleString();
  };

  if (isLoading || loading) {
    return (
      <MainCard>
        <Grid container spacing={gridSpacing}>
          <Grid item xs={12}>
            <Typography variant="h3">Top 5 模型 Token 消耗占比</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            <Typography variant="h3">Top 5 模型 Token 消耗占比</Typography>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1" color="error">
                数据加载失败
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
              <Typography variant="h3">Top 5 模型 Token 消耗占比</Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          {chartData && chartData.series.length > 0 ? (
            <Box sx={{ '& .apexcharts-canvas': { margin: '0 auto' } }}>
              <Chart
                options={chartData.options}
                series={chartData.series}
                type="donut"
                height={320}
              />
            </Box>
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

TopModelsChart.propTypes = {
  isLoading: PropTypes.bool
};

export default TopModelsChart;
