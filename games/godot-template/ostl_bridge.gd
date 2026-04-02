# ostl_bridge.gd — JavaScriptBridge for ostl. Platform
#
# Attach this script to your main game node.
# It handles all communication between your Godot game
# and the React wrapper that embeds it in an <iframe>.
#
# HOW IT WORKS:
#   1. Your game runs inside an <iframe> on the ostl. platform
#   2. The React wrapper sends opponent data IN via window.postMessage
#   3. Your game sends local player data OUT via JavaScriptBridge.eval()
#   4. The React wrapper relays everything over WebRTC to the opponent
#
# USAGE:
#   - Attach this script to an AutoLoad singleton named "OstlBridge"
#   - Call OstlBridge.send_to_opponent(data_dict) to send data
#   - Connect to OstlBridge.data_received signal to receive opponent data
#
# For the full guide, see PUBLISHING_GUIDE.md

extends Node

## Emitted when data arrives from the opponent via the React wrapper
signal data_received(data: Dictionary)

## Whether we're running inside the ostl. platform iframe
var is_embedded: bool = false

func _ready() -> void:
	# Detect if we're running in a browser and embedded in an iframe
	if OS.has_feature("web"):
		var result = JavaScriptBridge.eval("window.parent !== window")
		is_embedded = result == true
		
		if is_embedded:
			# Register a callback so the React wrapper can push data to us
			var callback = JavaScriptBridge.create_callback(_on_message_from_wrapper)
			JavaScriptBridge.eval("""
				window.__ostl_bridge_callback = %s;
				window.addEventListener('message', function(event) {
					try {
						var data = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
						window.__ostl_bridge_callback(data);
					} catch(e) {}
				});
			""" % str(callback))
			
			print("[OstlBridge] Connected to ostl. platform wrapper")
		else:
			print("[OstlBridge] Running standalone (not in iframe)")
	else:
		print("[OstlBridge] Running outside browser — bridge disabled")


## Send data to the opponent through the React wrapper → WebRTC pipeline
## @param data: Dictionary — will be JSON-serialized and sent via postMessage
func send_to_opponent(data: Dictionary) -> void:
	if not is_embedded:
		return
	
	var json_string = JSON.stringify(data)
	
	# Post the message up to the React parent window
	JavaScriptBridge.eval("""
		window.parent.postMessage('%s', '*');
	""" % json_string.replace("'", "\\'"))


## Send local player movement (convenience wrapper)
## @param x: float — player X position  
## @param y: float — player Y position
func send_move(x: float, y: float) -> void:
	send_to_opponent({
		"type": "MOVE",
		"x": x,
		"y": y
	})


## Send a custom game event (convenience wrapper)
## @param event_name: String — event identifier
## @param payload: Dictionary — event data
func send_event(event_name: String, payload: Dictionary = {}) -> void:
	var data = payload.duplicate()
	data["type"] = event_name
	send_to_opponent(data)


# ─── Internal ───────────────────────────────────────────

## Called by the JavaScript message listener when data arrives from React
func _on_message_from_wrapper(args) -> void:
	if args.size() == 0:
		return
	
	var raw = str(args[0])
	var parsed = JSON.parse_string(raw)
	
	if parsed is Dictionary:
		data_received.emit(parsed)
