import json
from channels.generic.websocket import AsyncWebsocketConsumer


class InventoryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_anonymous:
            await self.close()
            return
        
        await self.channel_layer.group_add("inventory_updates", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("inventory_updates", self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'subscribe_tile':
            tile_id = data.get('tile_id')
            if tile_id:
                await self.channel_layer.group_add(f"tile_{tile_id}", self.channel_name)
        elif message_type == 'unsubscribe_tile':
            tile_id = data.get('tile_id')
            if tile_id:
                await self.channel_layer.group_discard(f"tile_{tile_id}", self.channel_name)

    async def inventory_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'inventory_update',
            'data': event['data']
        }))