"""
REST API for serving price data to frontend
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.price_service import get_price_service
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Get price service instance
price_service = get_price_service()


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ai-agents-api'
    })


@app.route('/api/prices/current', methods=['GET'])
def get_current_prices():
    """
    Get current prices for specified tokens

    Query params:
        symbols: Comma-separated list of token symbols (e.g., "BTC,ETH")

    Returns:
        JSON with current prices
    """
    try:
        symbols_param = request.args.get('symbols', 'BTC,ETH')
        symbols = [s.strip().upper() for s in symbols_param.split(',')]

        logger.info(f"Fetching current prices for: {symbols}")

        prices = price_service.get_multiple_prices(symbols)

        # Format response
        result = {
            'success': True,
            'data': {
                symbol: {
                    'price': price,
                    'symbol': symbol,
                    'currency': 'USD'
                } if price else None
                for symbol, price in prices.items()
            }
        }

        return jsonify(result)

    except Exception as e:
        logger.error(f"Error fetching current prices: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/prices/history', methods=['GET'])
def get_price_history():
    """
    Get historical OHLC price data for a token

    Query params:
        symbol: Token symbol (e.g., "BTC", "ETH")
        days: Number of days of history (default: 30)

    Returns:
        JSON with historical OHLC data
    """
    try:
        symbol = request.args.get('symbol', 'BTC').upper()
        days = int(request.args.get('days', 30))

        # Validate days parameter
        if days not in [1, 7, 14, 30, 90, 180, 365]:
            days = 30  # Default to 30 days

        logger.info(f"Fetching {days} days of historical data for {symbol}")

        ohlc_data = price_service.get_historical_prices(symbol, days)

        if not ohlc_data:
            return jsonify({
                'success': False,
                'error': f'No historical data available for {symbol}'
            }), 404

        # Format response for frontend
        formatted_data = [
            {
                'timestamp': item.timestamp,
                'date': item.timestamp,  # Frontend expects 'date' field
                'open': item.open,
                'high': item.high,
                'low': item.low,
                'close': item.close
            }
            for item in ohlc_data
        ]

        result = {
            'success': True,
            'data': {
                'symbol': symbol,
                'days': days,
                'count': len(formatted_data),
                'ohlc': formatted_data
            }
        }

        return jsonify(result)

    except ValueError as e:
        logger.error(f"Invalid parameter: {e}")
        return jsonify({
            'success': False,
            'error': 'Invalid parameter value'
        }), 400
    except Exception as e:
        logger.error(f"Error fetching price history: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/prices/cache', methods=['GET'])
def get_cache_info():
    """
    Get information about cached prices

    Returns:
        JSON with cache information
    """
    try:
        cache_info = price_service.get_cache_info()

        return jsonify({
            'success': True,
            'data': cache_info
        })

    except Exception as e:
        logger.error(f"Error fetching cache info: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/prices/cache', methods=['DELETE'])
def clear_cache():
    """
    Clear the price cache

    Returns:
        JSON with success status
    """
    try:
        price_service.clear_cache()

        return jsonify({
            'success': True,
            'message': 'Cache cleared successfully'
        })

    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


def run_server(host='0.0.0.0', port=5000, debug=False):
    """
    Run the Flask server

    Args:
        host: Host to bind to (default: 0.0.0.0)
        port: Port to bind to (default: 5000)
        debug: Enable debug mode (default: False)
    """
    logger.info(f"Starting API server on {host}:{port}")
    app.run(host=host, port=port, debug=debug)


if __name__ == '__main__':
    # Run server in development mode on port 5001
    run_server(port=5001, debug=True)
