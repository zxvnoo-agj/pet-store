from loguru import logger


def configure_collection_logging():
    logger.add(
        "logs/collection_{time:YYYY-MM-DD}.log",
        rotation="1 day",
        retention="30 days",
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level:<7} | {extra[task_id]:<10} | {extra[product_id]:<8} | {extra[source]:<12} | {message}",
        filter=lambda record: record.get("extra", {}).get("component") == "collection",
        serialize=False,
    )


def get_collection_logger(task_id: str, product_id: str = "", source: str = ""):
    return logger.bind(
        component="collection",
        task_id=task_id,
        product_id=product_id or "-",
        source=source or "-",
    )
