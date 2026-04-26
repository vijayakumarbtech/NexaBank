import hashlib
import json
from datetime import datetime
from typing import List, Dict, Any


class Block:
    def __init__(self, index: int, data: Any, previous_hash: str):
        self.index = index
        self.timestamp = datetime.utcnow().isoformat()
        self.data = data
        self.previous_hash = previous_hash
        self.hash = self._compute_hash()

    def _compute_hash(self) -> str:
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash
        }, sort_keys=True, default=str)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self) -> Dict:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "hash": self.hash
        }


class Blockchain:
    def __init__(self):
        self.chain: List[Dict] = []
        self._create_genesis_block()

    def _create_genesis_block(self):
        genesis = Block(0, {"message": "Genesis Block - Banking Audit Chain"}, "0")
        self.chain.append(genesis.to_dict())

    def get_last_block(self) -> Dict:
        return self.chain[-1]

    def add_block(self, data: Any) -> Dict:
        previous_hash = self.get_last_block()["hash"]
        new_block = Block(len(self.chain), data, previous_hash)
        block_dict = new_block.to_dict()
        self.chain.append(block_dict)
        return block_dict

    def is_valid(self) -> bool:
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Verify hash matches
            recomputed = hashlib.sha256(
                json.dumps({
                    "index": current["index"],
                    "timestamp": current["timestamp"],
                    "data": current["data"],
                    "previous_hash": current["previous_hash"]
                }, sort_keys=True, default=str).encode()
            ).hexdigest()

            if current["hash"] != recomputed:
                return False

            if current["previous_hash"] != previous["hash"]:
                return False

        return True
