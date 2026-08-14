---
title: "sky-takeout-day05-note"
description: "Sky-takeout 苍穹外卖项目实战 Day05：Redis 数据结构、分布式缓存应用与营业状态设置。"
pubDate: 2025-10-14
tags: ["Java", "项目学习"]
category: "Java"
draft: false
---

# Sky-takeout Day05

---

> 【前言】
>
> Day05 的 Task 是 Redis 的入门，了解 Redis 数据类型、常用命令，如何在Java中使用Redis，以及 Redis 在项目中的应用场景，通过项目案例使用 Redis。

## Contents

* Redis入门
* Redis数据类型
* Redis常用命令
* 在Java中操作redis
* 店铺营业状态设置

## Redis入门

1. **简介：**Redis是一个基于**内存**的key-value结构数据库。Redis 是互联网技术领域使用最为广泛的**存储中间件**。
2. **主要特点：**

* 基于内存存储，读写性能高
* 适合存储热点数据（热点商品、资讯、新闻）
* 企业应用广泛

Redis是用C语言开发的一个开源的高性能键值对(key-value)数据库，官方提供的数据是可以达到100000+的QPS（每秒内查询次数）。它存储的value类型比较丰富，也被称为结构化的NoSql数据库。

NoSql（Not Only SQL），不仅仅是SQL，泛指**非关系型数据库**。NoSql数据库并不是要取代关系型数据库，而是关系型数据库的补充。

3. **Redis服务启动与停止：**

**windows 版** Redis 服务启动命令：**redis-server.exe redis.windows.conf**

Redis服务默认端口号为 **6379** ，通过快捷键**Ctrl + C** 即可停止Redis服务

当Redis服务启动成功后，可通过客户端进行连接。客户端连接命令：redis-cli.exe

通过redis-cli.exe命令默认连接的是本地的redis服务，并且使用默认6379端口。也可以通过指定如下参数连接：

* -h ip地址
* -p 端口号
* -a 密码（如果需要）

4. **修改Redis配置文件：**

若要设置Redis服务密码，修改redis.windows.conf

```
requirepass 123456
```

**注意：**

* 修改密码后需要重启Redis服务才能生效
* Redis配置文件中 # 表示注释

重启Redis后，再次连接Redis时，需加上密码，否则连接失败。

## Redis数据类型

1. **五种常用数据类型介绍**

Redis存储的是key-value结构的数据，其中key是字符串类型，value有5种常用的数据类型：

* 字符串 string
* 哈希 hash
* 列表 list
* 集合 set
* 有序集合 sorted set / zset

2. **数据类型特点：** ![image-20251014180847137](/images/posts/image-20251014180847137.png)

**解释说明：**

* 字符串(string)：普通字符串，Redis中最简单的数据类型
* 哈希(hash)：也叫散列，类似于Java中的HashMap结构
* 列表(list)：按照插入顺序排序，可以有重复元素，类似于Java中的LinkedList
* 集合(set)：无序集合，没有重复元素，类似于Java中的HashSet
* 有序集合(sorted set/zset)：集合中每个元素关联一个分数(score)，根据分数升序排序，没有重复元素

## Redis常用命令

以下只介绍 常用的 命令，更多命令可以参考Redis中文网：[https://www.redis.net.cn](https://www.redis.net.cn/)

### 字符串操作命令

Redis 中字符串类型常用命令：

* **SET** key value 设置指定key的值
* **GET** key 获取指定key的值
* **SETEX** key seconds value 设置指定key的值，并将 key 的过期时间设为 seconds 秒
* **SETNX** key value 只有在 key 不存在时设置 key 的值

### 哈希操作命令

Redis hash 是一个string类型的 field 和 value 的映射表，hash特别适合用于存储对象，常用命令：

* **HSET** key field value 将哈希表 key 中的字段 field 的值设为 value
* **HGET** key field 获取存储在哈希表中指定字段的值
* **HDEL** key field 删除存储在哈希表中的指定字段
* **HKEYS** key 获取哈希表中所有字段
* **HVALS** key 获取哈希表中所有值

### 列表操作命令

Redis 列表是简单的字符串列表，按照插入顺序排序，常用命令：

* **LPUSH** key value1 [value2] 将一个或多个值插入到列表头部
* **LRANGE** key start stop 获取列表指定范围内的元素
* **RPOP** key 移除并获取列表最后一个元素
* **LLEN** key 获取列表长度
* **BRPOP** key1 [key2 ] timeout 移出并获取列表的最后一个元素， 如果列表没有元素会阻塞列表直到等待超 时或发现可弹出元素为止

### 集合操作命令

Redis set 是string类型的无序集合。集合成员是唯一的，这就意味着集合中不能出现重复的数据，常用命令：

* **SADD** key member1 [member2] 向集合添加一个或多个成员
* **SMEMBERS** key 返回集合中的所有成员
* **SCARD** key 获取集合的成员数
* **SINTER** key1 [key2] 返回给定所有集合的交集
* **SUNION** key1 [key2] 返回所有给定集合的并集
* **SREM** key member1 [member2] 移除集合中一个或多个成员

### 有序集合操作命令

Redis有序集合是string类型元素的集合，且不允许有重复成员。每个元素都会关联一个double类型的分数。常用命令：

常用命令：

* **ZADD** key score1 member1 [score2 member2] 向有序集合添加一个或多个成员
* **ZRANGE** key start stop [WITHSCORES] 通过索引区间返回有序集合中指定区间内的成员
* **ZINCRBY** key increment member 有序集合中对指定成员的分数加上增量 increment
* **ZREM** key member [member …] 移除有序集合中的一个或多个成员

### 通用命令

Redis的通用命令是不分数据类型的，都可以使用的命令：

* KEYS pattern 查找所有符合给定模式( pattern)的 key
* EXISTS key 检查给定 key 是否存在
* TYPE key 返回 key 所储存的值的类型
* DEL key 该命令用于在 key 存在是删除 key

## 在Java中操作redis

### Redis的Java客户端：Spring Data Redis

Spring Data Redis 是 Spring 的一部分，提供了在 Spring 应用中通过简单的配置就可以访问 Redis 服务，对 Redis 底层开发包进行了高度封装。在 Spring 项目中，可以使用Spring Data Redis来简化 Redis 操作。

Spring Boot提供了对应的Starter，maven坐标：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

Spring Data Redis中提供了一个高度封装的类：**RedisTemplate**，对相关api进行了归类封装,将同一类型操作封装为operation接口，具体分类如下：

* ValueOperations：string数据操作
* SetOperations：set类型数据操作
* ZSetOperations：zset类型数据操作
* HashOperations：hash类型的数据操作
* ListOperations：list类型的数据操作

### 环境搭建

进入到sky-server模块

**1). 导入Spring Data Redis的maven坐标**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

**2). 配置Redis数据源**

在application-dev.yml中添加

```yaml
sky:
  redis:
    host: localhost
    port: 6379
    password: 123456
    database: 10
```

**解释说明：**

database:指定使用Redis的哪个数据库，Redis服务启动后默认有16个数据库，编号分别是从0到15。

可以通过修改Redis配置文件来指定数据库的数量。

在application.yml中添加读取application-dev.yml中的相关Redis配置

```yaml
spring:
  profiles:
    active: dev
  redis:
    host: ${sky.redis.host}
    port: ${sky.redis.port}
    password: ${sky.redis.password}
    database: ${sky.redis.database}
```

**3). 编写配置类，创建RedisTemplate对象**

```java
package com.sky.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@Slf4j
public class RedisConfiguration {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory redisConnectionFactory) {
        log.info("开始创建RedisTemplate模板对象...");
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();
        redisTemplate.setConnectionFactory(redisConnectionFactory);

        // Key序列化器（String类型，避免Key乱码）
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        // Value序列化器（JSON格式，支持对象、集合等复杂类型，且可读性好）
        redisTemplate.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        // Hash结构的Key序列化器
        redisTemplate.setHashKeySerializer(new StringRedisSerializer());
        // Hash结构的Value序列化器
        redisTemplate.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());

        redisTemplate.afterPropertiesSet(); // 初始化RedisTemplate
        return redisTemplate;
    }
}
```

**解释说明：**

当前配置类不是必须的，因为 **Spring Boot 框架会自动装配 RedisTemplate 对象**，但是**默认的key序列化器为**

**JdkSerializationRedisSerializer**，导致我们**存到Redis中后的数据和原始数据有差别**，故**设置为**

**StringRedisSerializer序列化器。**

**注：**

* `RedisTemplate`是**泛型类**（`RedisTemplate<K, V>`），若未指定泛型类型（如`<String, Object>`），编译器会因 “原始类型使用”“未检查调用” 报警告。这些警告虽不影响运行，但会降低代码规范性，且可能隐藏潜在类型转换问题。
* **解决方法**：修改`RedisConfiguration`类中的`redisTemplate`方法，指定泛型为`<String, Object>`（Redis 的 Key 通常为 String，Value 为任意对象），并完善序列化器配置（避免 Redis 存储数据时出现乱码）。
* 泛型`<String, Object>`的指定，消除了 “原始类型使用”“未检查调用” 的警告。
* 完善的序列化器配置（`StringRedisSerializer`+`GenericJackson2JsonRedisSerializer`），确保 Redis 中 Key、Value 的存储格式清晰（避免乱码），且支持对象、集合等复杂类型的序列化 / 反序列化。

**4). 通过RedisTemplate对象操作Redis**

在test下新建测试类

```java
package com.sky.test;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.*;

@SpringBootTest
public class SpringDataRedisTest {
    @Autowired
    private RedisTemplate redisTemplate;

    @Test
    public void testRedisTemplate(){
        System.out.println(redisTemplate);
        //string数据操作
        ValueOperations valueOperations = redisTemplate.opsForValue();
        //hash类型的数据操作
        HashOperations hashOperations = redisTemplate.opsForHash();
        //list类型的数据操作
        ListOperations listOperations = redisTemplate.opsForList();
        //set类型数据操作
        SetOperations setOperations = redisTemplate.opsForSet();
        //zset类型数据操作
        ZSetOperations zSetOperations = redisTemplate.opsForZSet();
    }
}
```

测试：

![image-20251014181653327](/images/posts/image-20251014181653327.png)

说明RedisTemplate对象注入成功，并且通过该RedisTemplate对象获取操作5种数据类型相关对象。

### 操作常见类型数据

**1). 操作字符串类型数据**

```java
/**
    * 操作字符串类型的数据
    */
   @Test
   public void testString(){
       // set get setex setnx
       redisTemplate.opsForValue().set("name","小明");
       String city = (String) redisTemplate.opsForValue().get("name");
       System.out.println(city);
       redisTemplate.opsForValue().set("code","1234",3, TimeUnit.MINUTES);
       redisTemplate.opsForValue().setIfAbsent("lock","1");
       redisTemplate.opsForValue().setIfAbsent("lock","2");
   }
```

**2). 操作哈希类型数据**

```java
/**
    * 操作哈希类型的数据
    */
   @Test
   public void testHash(){
       //hset hget hdel hkeys hvals
       HashOperations hashOperations = redisTemplate.opsForHash();

       hashOperations.put("100","name","tom");
       hashOperations.put("100","age","20");

       String name = (String) hashOperations.get("100", "name");
       System.out.println(name);

       Set keys = hashOperations.keys("100");
       System.out.println(keys);

       List values = hashOperations.values("100");
       System.out.println(values);

       hashOperations.delete("100","age");
   }
```

**3). 操作列表类型数据**

```java
/**
    * 操作列表类型的数据
    */
   @Test
   public void testList(){
       //lpush lrange rpop llen
       ListOperations listOperations = redisTemplate.opsForList();

       listOperations.leftPushAll("mylist","a","b","c");
       listOperations.leftPush("mylist","d");

       List mylist = listOperations.range("mylist", 0, -1);
       System.out.println(mylist);

       listOperations.rightPop("mylist");

       Long size = listOperations.size("mylist");
       System.out.println(size);
   }
```

**4). 操作集合类型数据**

```java
/**
    * 操作集合类型的数据
    */
   @Test
   public void testSet(){
       //sadd smembers scard sinter sunion srem
       SetOperations setOperations = redisTemplate.opsForSet();

       setOperations.add("set1","a","b","c","d");
       setOperations.add("set2","a","b","x","y");

       Set members = setOperations.members("set1");
       System.out.println(members);

       Long size = setOperations.size("set1");
       System.out.println(size);

       Set intersect = setOperations.intersect("set1", "set2");
       System.out.println(intersect);

       Set union = setOperations.union("set1", "set2");
       System.out.println(union);

       setOperations.remove("set1","a","b");
   }
```

**5). 操作有序集合类型数据**

```java
/**
    * 操作有序集合类型的数据
    */
   @Test
   public void testZset(){
       //zadd zrange zincrby zrem
       ZSetOperations zSetOperations = redisTemplate.opsForZSet();

       zSetOperations.add("zset1","a",10);
       zSetOperations.add("zset1","b",12);
       zSetOperations.add("zset1","c",9);

       Set zset1 = zSetOperations.range("zset1", 0, -1);
       System.out.println(zset1);

       zSetOperations.incrementScore("zset1","c",10);

       zSetOperations.remove("zset1","a","b");
   }
```

**6). 通用命令操作**

```java
/**
    * 通用命令操作
    */
   @Test
   public void testCommon(){
       //keys exists type del
       Set keys = redisTemplate.keys("*");
       System.out.println(keys);

       Boolean name = redisTemplate.hasKey("name");
       Boolean set1 = redisTemplate.hasKey("set1");

       for (Object key : keys) {
           DataType type = redisTemplate.type(key);
           System.out.println(type.name());
       }

       redisTemplate.delete("mylist");
   }
```

## 店铺营业状态设置

### 需求分析与接口设计

* 进到苍穹外卖后台，显示餐厅的营业状态，营业状态分为**营业中**和**打烊中**，若当前餐厅处于营业状态，自动接收任何订单，客户可在小程序进行下单操作；若当前餐厅处于打烊状态，不接受任何订单，客户便无法在小程序进行下单操作。

**产品原型：**  
![image-20251014181952632](/images/posts/image-20251014181952632.png)

**接口设计：**

* 设置营业状态
* 管理端查询营业状态
* 用户端查询营业状态

**注**：从技术层面分析，其实管理端和用户端查询营业状态时，可通过一个接口去实现即可。因为营业状态是一致的。但是，本项目约定：

* **管理端**发出的请求，统一使用/admin作为前缀。
* **用户端**发出的请求，统一使用/user作为前缀。

因为访问路径不一致，故分为两个接口实现。

**1). 设置营业状态**  
![image-20251014182121927](/images/posts/image-20251014182121927.png)

**2). 管理端营业状态**  
![image-20251014182128446](/images/posts/image-20251014182128446.png)

**3). 用户端营业状态**  
![image-20251014182134665](/images/posts/image-20251014182134665.png)

**营业状态存储方式**

虽然，可以通过一张表来存储营业状态数据，但整个表中只有一个字段，所以意义不大。

营业状态数据存储方式：基于Redis的字符串来进行存储。**约定**：1表示营业 0表示打烊。  
![image-20251014182318284](/images/posts/image-20251014182318284.png)

### 代码编写

**admin/ShopController.java**

```java
package com.sky.controller.admin;

import com.sky.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.*;

@RestController("adminShopController")
@RequestMapping("admin/shop")
@Slf4j
@Api(tags = "管理端-商铺相关接口")
public class ShopController {

    private final static String KEY = "SHOP_STATUS_";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 设置店铺营业状态
     *
     * @param status 店铺状态 0-打烊 1-营业
     * @return 无
     */
    @PutMapping("/{status}")
    @ApiOperation("设置店铺营业状态")
    public Result<Void> setStatus(@PathVariable Integer status) {
        log.info("设置店铺营业状态：{}", (status == 1 ? "营业" : "打烊"));
        // 将店铺状态存入 Redis
        redisTemplate.opsForValue().set(KEY, status);
        return Result.success();
    }

    /**
     * 获取店铺营业状态
     *
     * @return 店铺状态 0-打烊 1-营业
     */
    @ApiOperation("获取店铺营业状态")
    @GetMapping("/status")
    public Result<Integer> getStatus() {
        Integer status = (Integer) redisTemplate.opsForValue().get(KEY);
        log.info("获取店铺营业状态：{}", (status != null && status == 1 ? "营业" : "打烊"));
        return Result.success(status);
    }
}
```

**user/ShopController.java**

```java
package com.sky.controller.user;

import com.sky.result.Result;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("user/shop")
@Slf4j
@Api(tags = "用户端-商铺相关接口")
public class ShopController {

    private static final String KEY = "SHOP_STATUS_";

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 获取店铺营业状态
     *
     * @return 店铺状态 0-打烊 1-营业
     */
    @GetMapping("/status")
    @ApiOperation("获取店铺营业状态")
    public Result<Integer> getStatus() {
        Integer status = (Integer) redisTemplate.opsForValue().get(KEY);
        log.info("获取店铺营业状态：{}", (status != null && status == 1 ? "营业" : "打烊"));
        return Result.success(status);
    }
}
```

### 功能测试

**注意！：** 测试时记得要把Redis服务开启，否则连接不到Redis，数据都存不了，更别谈测试了。

在接口文档测试中，管理端和用户端的接口放在一起，不方便区分。

接下来，我们要实现管理端和用户端接口进行区分。

在WebMvcConfiguration.java中，分别扫描”com.sky.controller.admin”和”com.sky.controller.user”这两个包。

```java
@Bean
   public Docket docket1(){
       log.info("准备生成接口文档...");
       ApiInfo apiInfo = new ApiInfoBuilder()
               .title("苍穹外卖项目接口文档")
               .version("2.0")
               .description("苍穹外卖项目接口文档")
               .build();

       Docket docket = new Docket(DocumentationType.SWAGGER_2)
               .groupName("管理端接口")
               .apiInfo(apiInfo)
               .select()
               //指定生成接口需要扫描的包
               .apis(RequestHandlerSelectors.basePackage("com.sky.controller.admin"))
               .paths(PathSelectors.any())
               .build();

       return docket;
   }

   @Bean
   public Docket docket2(){
       log.info("准备生成接口文档...");
       ApiInfo apiInfo = new ApiInfoBuilder()
               .title("苍穹外卖项目接口文档")
               .version("2.0")
               .description("苍穹外卖项目接口文档")
               .build();

       Docket docket = new Docket(DocumentationType.SWAGGER_2)
               .groupName("用户端接口")
               .apiInfo(apiInfo)
               .select()
               //指定生成接口需要扫描的包
               .apis(RequestHandlerSelectors.basePackage("com.sky.controller.user"))
               .paths(PathSelectors.any())
               .build();

       return docket;
   }
```

重启服务器，再次访问接口文档，可进行选择**用户端接口**或者**管理端接口**  
![image-20251014182641746](/images/posts/image-20251014182641746.png)

设置状态测试：

![image-20251014192349262](/images/posts/image-20251014192349262.png)

获取状态测试：  
![image-20251014192442953](/images/posts/image-20251014192442953.png)

日志查看  
![image-20251014192518244](/images/posts/image-20251014192518244.png)
