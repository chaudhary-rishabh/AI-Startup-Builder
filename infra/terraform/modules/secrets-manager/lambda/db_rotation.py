"""
Placeholder rotation hook for Secrets Manager.
Wire to RDS rotation by replacing with AWS Secrets Manager rotation template for PostgreSQL.
"""

import json


def lambda_handler(event, context):
    _ = (event, context)
    return {"statusCode": 200, "body": json.dumps({"message": "configure rotation"})}
